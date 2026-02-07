# Raspberry Pi 3B Setup

## Was du brauchst

- Raspberry Pi 3B mit Netzteil
- microSD-Karte (16 GB reicht)
- SD-Kartenleser fuer den Mac
- Ethernet-Kabel oder WLAN-Zugangsdaten

## 1. SD-Karte flashen

1. **Raspberry Pi Imager** herunterladen und installieren: https://www.raspberrypi.com/software/
2. Imager oeffnen
3. **Modell:** Raspberry Pi 3
4. **OS:** Raspberry Pi OS (other) → **Raspberry Pi OS Lite (64-bit)** (kein Desktop noetig)
5. **SD-Karte** auswaehlen
6. Auf das **Zahnrad-Icon** klicken (oder Cmd+Shift+X) fuer erweiterte Einstellungen:
   - **Hostname:** `rezepte`
   - **SSH aktivieren:** Ja, mit Passwort-Authentifizierung
   - **Benutzername/Passwort** festlegen (z.B. `pi` / dein Passwort)
   - **WLAN konfigurieren:** SSID und Passwort eintragen, Land: DE
7. **Schreiben** klicken und warten

## 2. Erster Start

1. SD-Karte in den Raspi stecken
2. Netzteil anschliessen (und ggf. Ethernet-Kabel)
3. Ca. 1-2 Minuten warten bis er hochgefahren ist
4. Verbinden:
   ```
   ssh pi@rezepte.fritz.box
   ```
   (Falls der Hostname noch nicht aufgeloest wird: in der Fritz!Box unter Heimnetz > Netzwerk die IP nachschauen)

## 3. System aktualisieren

```bash
sudo apt update && sudo apt upgrade -y
```

## 4. Docker installieren

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker pi
```

Danach **aus- und wieder einloggen**, damit die Gruppenrechte greifen.

Testen:
```bash
docker run --rm hello-world
```

## 5. Feste IP in der Fritz!Box

1. Fritz!Box oeffnen: http://fritz.box
2. Heimnetz > Netzwerk
3. Den Eintrag "rezepte" finden und auf den Stift klicken
4. Haken bei "Diesem Netzwerkgeraet immer die gleiche IPv4-Adresse zuweisen"
5. Uebernehmen

## 6. Bei GitHub Container Registry anmelden

Du brauchst einen GitHub Personal Access Token (classic) mit dem Scope `read:packages`:

1. https://github.com/settings/tokens/new oeffnen
2. Note: `raspi-ghcr`
3. Scope: nur `read:packages` ankreuzen
4. Token generieren und kopieren

Auf dem Raspi:
```bash
docker login ghcr.io -u TMogdans
```
Passwort = der eben erstellte Token. Die Anmeldung bleibt gespeichert.

## 7. App deployen

Projektverzeichnis auf dem Raspi anlegen und Rezepte hinkopieren:
```bash
mkdir -p ~/wwe/rezepte
```

Die `docker-compose.prod.yml` auf den Raspi kopieren (vom Mac aus):
```bash
scp docker-compose.prod.yml pi@rezepte.fritz.box:~/wwe/docker-compose.yml
```

Die Rezepte ruebersynchen (vom Mac aus):
```bash
scp rezepte/*.cook pi@rezepte.fritz.box:~/wwe/rezepte/
```

Auf dem Raspi starten:
```bash
cd ~/wwe
docker compose pull
docker compose up -d
```

## 8. Updates deployen

Wenn du Aenderungen auf `main` pushst, baut GitHub Actions automatisch ein neues Image. Auf dem Raspi dann einfach:
```bash
cd ~/wwe
docker compose pull
docker compose up -d
```

## Fertig

Die App ist erreichbar unter `http://rezepte.fritz.box`.
