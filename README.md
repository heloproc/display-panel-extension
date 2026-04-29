# Display Manager

A GNOME Shell extension that gives you real-time control over your display's brightness, contrast, saturation, hue, and color temperature — all applied via a GPU shader directly on the screen compositor.

No external tools required & works entirely within GNOME Shell, for laptop screen and external displays, all together at once.

---

## Features

- **Brightness** — lift or lower the overall luminance
- **Contrast** — make colors pop or flatten them out
- **Saturation** — go grayscale or push colors to the extreme
- **Hue Shift** — rotate the entire color wheel
- **Color Temperature** — warm up or cool down your display

> [!NOTE]
> All changes are to be made via slider provided.

Settings are saved automatically and restored on login. You can also control everything via DBus from any external script or app.

---

## Requirements

- GNOME Shell **45, 46, 47, or 48**

---

## Installation

### Manual

```bash
# Clone the repo
git clone https://github.com/heloproc/display-panel-extension.git

# Copy to extensions folder
cp -r display-panel-extensio ~/.local/share/gnome-shell/extensions/display-panel@alien

# Compile the GSettings schema
glib-compile-schemas ~/.local/share/gnome-shell/extensions/display-panel@alien/schemas/

# Restart GNOME Shell (X11 ; on Wayland log out and back in)
# Then enable the extension
gnome-extensions enable display-panel@alien
```

---

## Usage

Open **GNOME Extensions** app or go to **Settings → Extensions → Custom Color Manager** and click the gear icon to open the preferences panel.

All sliders update the display live. A small tick mark on each slider shows the default value — double-click to reset a single slider, or use the **Reset All** button at the bottom.

### DBus Control

You can also drive the extension from the terminal or a custom app:

```bash
gdbus call --session \
  --dest org.gnome.Shell \
  --object-path /org/gnome/Shell/Extensions/DisplayPanel \
  --method org.gnome.Shell.Extensions.DisplayPanel.SetBrightness \
  0.1
```

Available methods: `SetBrightness`, `SetContrast`, `SetSaturation`, `SetHue`, `SetTemperature`

All values are doubles. Ranges match the sliders in the preferences window.
