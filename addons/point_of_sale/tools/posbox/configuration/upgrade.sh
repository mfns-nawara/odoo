#!/usr/bin/env bash

require_command () {
    type "$1" &> /dev/null || { echo "Command $1 is missing. Install it e.g. with 'apt-get install $1'. Aborting." >&2; exit 1; }
}

require_command kpartx

service odoo stop
mount -o remount,rw /

umount -av

echo "Fdisking"

PATH_DIR=/home/pi/odoo/addons/point_of_sale/tools/posbox/configuration/
PARTITION=$(lsblk | awk 'NR==2 {print $1}')
PARTITION="/dev/${PARTITION}"
SECTORS_SIZE=$(fdisk -l "${PARTITION}" | awk 'NR==1 {print $7}')

if [ "${SECTORS_SIZE}" -lt 31166976 ]
then
    exit 1
fi

PART_BOOT=$(fdisk -l | tail -n 2 | awk 'NR==1 {print $1}')
PART_ODOO_ROOT=$(fdisk -l | tail -n 1 | awk '{print $1}')
START_OF_ODOO_ROOT_PARTITION=$(fdisk -l | tail -n 1 | awk '{print $2}')
END_OF_ODOO_ROOT_PARTITION=$((START_OF_ODOO_ROOT_PARTITION + 20783011)) # sectors to have a partition of ~9.9Go
START_OF_UPGRADE_ROOT_PARTITION=$((SECTORS_SIZE - 14695050)) # sectors to have a partition of ~7.0Go
(echo 'p';                                  # print
 echo 'd';                                  # delete partition
 echo '2';                                  #   number 2
 echo 'n';                                  # create new partition
 echo 'p';                                  #   primary
 echo '2';                                  #   number 2
 echo "${START_OF_ODOO_ROOT_PARTITION}";    #   starting at previous offset
 echo "${END_OF_ODOO_ROOT_PARTITION}";      #   ending at ~9.9Go
 echo 'n';                                  # create new partition
 echo 'p';                                  #   primary
 echo '3';                                  #   number 2
 echo "${START_OF_UPGRADE_ROOT_PARTITION}"; #   starting at previous offset
 echo '';                                   #   ending at default (fdisk should propose max) ~7.0Go
 echo 'p';                                  # print
 echo 'w') |fdisk "${PARTITION}"       # write and quit

PART_RASPBIAN_ROOT=$(sudo fdisk -l | tail -n 1 | awk '{print $1}')
sleep 5

# Clean partition
mount -o remount,rw /
partprobe # apply changes to partitions
resize2fs "${PART_ODOO_ROOT}"
mkfs.ext4 -Fv "${PART_RASPBIAN_ROOT}" # change file sytstem
e2fsck -fv "${PART_RASPBIAN_ROOT}" # resize2fs requires clean fs
mkfs.ext4 -Fv "${PART_BOOT}" # format file sytstem
e2fsck -fv "${PART_BOOT}" # clean fs

# download latest Raspbian image
wget 'https://downloads.raspberrypi.org/raspbian_lite_latest' -O raspbian.img.zip
unzip raspbian.img.zip
rm -v raspbian.img.zip
RASPBIAN=$(echo *raspbian*.img)

# mapper raspbian
LOOP_RASPBIAN=$(kpartx -avs "${RASPBIAN}")
LOOP_RASPBIAN_ROOT=$(echo "${LOOP_RASPBIAN}" | tail -n 1 | awk '{print $3}')
LOOP_RASPBIAN_ROOT="/dev/mapper/${LOOP_RASPBIAN_ROOT}"
LOOP_BOOT=$(echo "${LOOP_RASPBIAN}" | tail -n 2 | awk 'NR==1 {print $3}')
LOOP_BOOT="/dev/mapper/${LOOP_BOOT}"

# copy raspbian
dd if="${LOOP_RASPBIAN_ROOT}" of="${PART_RASPBIAN_ROOT}" bs=4M status=progress
# copy boot
dd if="${LOOP_BOOT}" of="${PART_BOOT}" bs=4M status=progress

# Modify startup
mkdir -v raspbian
mount -v "${PART_RASPBIAN_ROOT}" raspbian
cp -v "${PATH_DIR}"/upgrade2.sh raspbian/home/pi/
cp -v "${PATH_DIR}"/upgrade3.sh raspbian/home/pi/
NBR_LIGNE=$(sed -n -e '$=' raspbian/etc/rc.local)
sed -ie "${NBR_LIGNE}"'i\/home/pi/upgrade2.sh' raspbian/etc/rc.local
cp -v /etc/fstab raspbian/etc/fstab
sed -ie "s/$(echo ${PART_ODOO_ROOT} | sed -e 's/\//\\\//g')/$(echo ${PART_RASPBIAN_ROOT} | sed -e 's/\//\\\//g')/g" raspbian/etc/fstab
umount -v raspbian

# Modify boot file
mkdir -v boot
mount -v "${PART_BOOT}" boot
PART_IOT_BOOT_ID=$(grep -oP '(?<=root=).*(?=rootfstype)' boot/cmdline.txt)
sed -ie "s/$(echo ${PART_IOT_BOOT_ID} | sed -e 's/\//\\\//g')/$(echo ${PART_RASPBIAN_ROOT} | sed -e 's/\//\\\//g')/g" boot/cmdline.txt
umount -v boot

kpartx -dv "${RASPBIAN}"
rm -v "${RASPBIAN}"

reboot
