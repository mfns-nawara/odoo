#!/usr/bin/env bash

mount -o remount,rw /

# clean partitions
PART_RASPBIAN_ROOT=$(fdisk -l | tail -n 1 | awk '{print $1}')
mkfs.ext4 -Fv "${PART_RASPBIAN_ROOT}" # format file sytstem
wipefs -a "${PART_RASPBIAN_ROOT}"

PARTITION=$(lsblk | awk 'NR==2 {print $1}')
PARTITION="/dev/${PARTITION}"

(echo 'p';                                  # print
 echo 'd';                                  # delete partition
 echo '3';                                  #   number 2
 echo 'p';                                  # print
 echo 'w') |fdisk "${PARTITION}"       # write and quit

partprobe

NBR_LIGNE=$(sed -n -e '$=' /etc/rc.local)
DEL_LIGNE=$((NBR_LIGNE - 1))
sed -i "${DEL_LIGNE}"'d' /root_bypass_ramdisks/etc/rc.local

rm /home/pi/upgrade3.sh

mount -o remount,ro /
