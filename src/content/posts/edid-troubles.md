---
title: EDID troubles on different OSes
description: Had to mess around with EDID on Windows, it's surprisingly harder than on Linux (or even hackintoshes)
pubDate: 2025-12-19
author: randalthor17
draft: false
tags:
  - Linux
  - Windows
  - Tech
  - Hardware
---
I had to face this bizarre issue over the last month or so, and I think I should write this down just for documentation's sake.

### What happened?

So, my old monitor (a very old Dell monitor, a 5:4 VGA monitor at that) started to show damage in its panel. I ignored the issue for as long as I could, until it became so unbearable that I couldn't even read text on the screen. As such, I went ahead and bought a new monitor.

The new monitor was an MSI MP243X monitor. It's a 100Hz 1080p monitor, a decent one at that. I had to buy a VGA-to-HDMI converter (one that converts the VGA out coming from the motherboard into HDMI out signals), as my PC doesn't have a dGPU or any HDMI out. The converter worked somewhat decently when I had it demoed at the shop, but as I came back home and tested it, it seemed like the monitor was running at 4:3 mode, and had huuuuge black bars on both sides. 

### Preliminary tests on Linux

I decided that this was happening because the converter was cheap and didn't advertise the proper display properties. I asked ChatGPT (obviously) and it pointed me towards something called EDID (Extended Display Identification Data), which is advertised by displays to the devices they are connected to. This EDID tells the devices what resolutions are supported, how to drive them and so on. Apparently the converter was so cheap that it advertised a very basic EDID of 1024x768@60Hz resolution, which is kinda unacceptable.

I decided that there should be a way to spoof this resolution somehow. ChatGPT pointed me towards a tool called CRU (Custom Resolution Utility) on Windows, that can generate EDIDs for me. But unfortunately I was on Linux. Apparently, by doing some xrandr doohickey, I could generate an EDID. Basically,
- I asked ChatGPT to generate a test modeline for X11 (still don't understand what a modeline is)
- And then used [modeline2edid](https://github.com/akatrevorjay/edid-generator) to convert that modeline to EDID
- Copied that `edid.bin` to `/usr/lib/firmware/edid/`
- Added `drm.edid_firmware=edid/edid.bin` to my boot args (taken from the [Archwiki](https://wiki.archlinux.org/title/Kernel_mode_setting#Forcing_modes_and_EDID))
- As I'm on Fedora, added `/etc/dracut.conf.d/99-edid.conf` (I think, I don't remember):
```
install_items+=" /usr/lib/firmware/edid/edid.bin "
```
- Rebuilt my initramfs with `sudo dracut -f`

And voilà! My display works properly now! Well, no, not really. I had to ask ChatGPT to generate a modeline with CVT-RB timings specifically, otherwise the display was shifted a bit and some parts got cut off (I don't know why either, it's apparently some clock timings).

I copied the generated EDID over to my Hackintosh, used OpenCore to load it, but unfortunately, it looked shifted again. I gave up on it and used a slightly lower resolution instead.

### A better solution found

The system was working well enough, when coincidentally I stumbled upon [fwupd](https://github.com/fwupd/fwupd), and then [a huge repo containing user submitted EDID dumps from monitors](https://github.com/linuxhw/EDID). I found two entries for my monitor, but they didn't work well enough, I assume the hardware versions were different.

Then I decided to use [hw-probe](https://github.com/linuxhw/hw-probe), cause the EDID dump is made by users using this tool to upload their hardware info. I used an old laptop that had an HDMI port, did all the probing and uploading, but couldn't figure out where the files were uploaded so that I could use them too.

Then my mind went, "If everything in Linux is a file, then the EDID advertised by the monitor must be a file too, I just gotta copy it." And sure enough, EDIDs can be found at `/sys/class/drm/card*/edid`. I copied the EDID to a USB drive, replaced my old EDID on the PC, and voilà! All the resolutions work at last! 

Although 100Hz options or 10bit color options don't work, because they don't work over VGA, but this is more than I expected. I had moved on from hackintoshing, so I don't know how well this works under OpenCore.

### Windows hijinks

Just today, I had to install Windows (because I have to do some PowerPoint stuff very soon), and I faced the good old resolution issue yet again. I installed CRU, gave it the EDID, still the resolution changing option stayed greyed out. I tried:
- Reinstalling the graphics AND the monitor driver
- Rebooting again and again
- Exporting the CRU profile as a monitor driver and installing it

And still it wouldn't work. 

At last, I realized that there's an option under Settings for "Advanced Display Adapter settings", that has a "Show all modes" option, which allowed me to choose an arbitrary resolution among those advertised by the custom EDID that I installed. Took me like.... 2 hours to figure this out. CRU was working okay the entire time, but Windows was just hiding the new resolutions (maybe because there was a conflict between the driver's EDID and the converter advertised EDID).

### Conclusion 

Honestly, the main takeaway from this example is that Linux and Hackintosh have better documentation than Windows does, and Windows often hides more technical settings in the name of user convenience. Makes it a headache at times. You gotta know where to look, and that takes loads of experience (or loads of googling), and sometimes there IS no solution to the problem you're looking for. That's all.


#### Update:

I just installed a Fedora Silver blue based distro, and I used [this guide](https://www.reddit.com/r/Bazzite/comments/1gajkpg/add_a_custom_resolution/mt9o5by/) to use the EDID on there. For archival's sake, here are the steps:

- Install `fpm`:

```bash
rpm-ostree update
rpm-ostree install ruby-devel rubygems rpm-build
systemctl reboot
sudo gem install fpm
```

- Make and install the rpm package from the bin:

```bash
mkdir -p ~/edid_patch/usr/lib/firmware/edid
cp my_edid.bin ~/edid_patch/usr/lib/firmware/edid/
cd ~/edid_patch
fpm -s dir -t rpm -n edid_patch .
```

Use `ls` to find the exact name of the generated rpm file, as it can vary from the below

```bash
rpm-ostree install edid_patch-1.0-1.x86_64.rpm
```
- Update initramfs:

```bash
echo 'install_items+=" /usr/lib/firmware/edid/my_edid.bin "' | sudo tee /etc/dracut.conf.d/99-local.conf
rpm-ostree initramfs --enable
```

- Add the kernel argument, then reboot

```bash
rpm-ostree kargs --append=drm.edid_firmware=edid/my_edid.bin
```

You can also specify a specific output port such as `HDMI-A-1:edid/my_edid.bin`

```bash
systemctl reboot
```

Then just choose your desired resolution after reboot!