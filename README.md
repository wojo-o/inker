<a href="https://buymeacoffee.com/wojo_o" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="40"></a>

Self-hosted e-ink device management system for [TRMNL](https://usetrmnl.com/) devices and devices compatible with TRMNL 1.6.9 software. Design screens, create custom widgets, and manage your displays from a modern web interface.

![Dashboard](https://github.com/user-attachments/assets/fd9affac-5c57-4448-9338-ea8f83add08a)

## Features

- **Screen Designer** — Drag & drop widget placement, snap guides, freehand drawing, export/import
- **Built-in Widgets** — Clock, date, text, weather, countdown, days until, QR code, image, GitHub stars, battery, WiFi, device info
- **Custom Widgets** — Connect to any JSON API or RSS feed, field extraction, JavaScript transformations, grid layouts
- **Playlists** — Rotate multiple screens on devices automatically
- **Device Management** — Auto-provisioning, real-time status, configurable refresh rates, logs

## Screenshots

| Screen Designer | Devices | Screens |
|:-:|:-:|:-:|
|  ![Devices](https://github.com/user-attachments/assets/e6ba89e7-7bac-419e-bb2e-54a1c0350e07) | ![Screens](https://github.com/user-attachments/assets/510c7d5c-730a-457d-af7d-50ee04b2dc43) | ![Screen Designer](https://github.com/user-attachments/assets/0e4fb32a-bde5-475f-8800-49b06cfce2e9) |

| List of sources | Custom Data Sources | Custom Widgets |
|:-:|:-:|:-:|
| ![Extensions](https://github.com/user-attachments/assets/534b5104-8f1c-4a42-8c58-f2cef74dbc92) | ![Custom data sources](https://github.com/user-attachments/assets/03ed0dc8-7ae0-44fa-ace7-890b5ec8f385) | ![Custom widgets](https://github.com/user-attachments/assets/0eb10812-568a-46db-b58e-7e82c19ea403) |

## Quick start

```bash
git clone https://github.com/wojo-o/inker.git
cd inker
cp .env.example .env    # optionally edit settings
docker compose up -d --build
```

Open **http://your-server-ip:80** and log in with PIN `1111`.

> First start takes a few minutes to build. Subsequent starts are instant.

## Configuration

Copy `.env.example` to `.env` and edit as needed:

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_PIN` | Login PIN | `1111` |
| `POSTGRES_PASSWORD` | Database password | `inker_password` |
| `TZ` | Timezone for widgets | `UTC` |
| `JWT_SECRET` | Session signing key | dev default |
| `INKER_PORT` | Frontend port | `80` |

<b>Showcase</b>

<img width="664" height="445" alt="image" src="https://github.com/user-attachments/assets/871519a2-b2ca-4d5f-ad97-502d11ff5953" />


## License

Source Available — see [LICENSE](LICENSE) for details.
