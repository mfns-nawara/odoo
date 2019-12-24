#!/usr/bin/env bash

mount -o remount,rw /

apt-get -y install kpartx

PART_RASPBIAN_ROOT=$(fdisk -l | tail -n 1 | awk '{print $1}')
PART_IOTBOX_ROOT=$(fdisk -l | tail -n 2 | awk 'NR==1 {print $1}')
PART_BOOT=$(fdisk -l | tail -n 3 | awk 'NR==1 {print $1}')
resize2fs "${PART_RASPBIAN_ROOT}"

# download latest IoT Box image
wget 'http://nightly.odoo.com/master/posbox/iotbox/iotbox-latest.zip' -O iotbox.img.zip
unzip iotbox.img.zip
rm -v iotbox.img.zip
IOTBOX=$(echo *iotbox*.img)

# mapper IoTBox
LOOP_IOTBOX=$(kpartx -avs "${IOTBOX}")
LOOP_IOTBOX_ROOT=$(echo "${LOOP_IOTBOX}" | tail -n 1 | awk '{print $3}')
LOOP_IOTBOX_ROOT="/dev/mapper/${LOOP_IOTBOX_ROOT}"
LOOP_BOOT=$(echo "${LOOP_IOTBOX}" | tail -n 2 | awk 'NR==1 {print $3}')
LOOP_BOOT="/dev/mapper/${LOOP_BOOT}"

umount -av

# copy new IoT Box
dd if="${LOOP_IOTBOX_ROOT}" of="${PART_IOTBOX_ROOT}" bs=4M status=progress
# copy boot of new IoT Box
dd if="${LOOP_BOOT}" of="${PART_BOOT}" bs=4M status=progress

mount -v "${PART_BOOT}" /boot

# Modify boot file
PART_BOOT_ID=$(grep -oP '(?<=root=).*(?=rootfstype)' /boot/cmdline.txt)
sed -ie "s/$(echo ${PART_BOOT_ID} | sed -e 's/\//\\\//g')/$(echo ${PART_IOTBOX_ROOT} | sed -e 's/\//\\\//g')/g" /boot/cmdline.txt
sed -i 's| init=/usr/lib/raspi-config/init_resize.sh||' /boot/cmdline.txt

# Modify startup
mkdir -v odoo
mount -v "${PART_IOTBOX_ROOT}" odoo
cp -v /home/pi/upgrade3.sh odoo/home/pi/
NBR_LIGNE=$(sed -n -e '$=' odoo/etc/rc.local)
sed -ie "${NBR_LIGNE}"'i\/home/pi/upgrade3.sh' odoo/etc/rc.local

reboot
