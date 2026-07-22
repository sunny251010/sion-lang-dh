# Sion Lang DH

Website tinh gon de ho tro chuan bi sinh hoat Sabat. Frontend nam trong `docs/` de deploy bang GitHub Pages, backend Apps Script nam trong `backend/` nhu source backup.

## Cau truc

```text
docs/
  index.html
  tab-generator.html
  lucky-wheel.html
  css/
  js/
  assets/
backend/
  apps-script.gs
```

## Chay local

Cach nhanh nhat la mo truc tiep `docs/index.html` bang trinh duyet.

Neu muon mo phong gan giong GitHub Pages hon, dung extension Live Server trong VS Code va mo thu muc `docs/`.

## Cau hinh API

Frontend doc Apps Script API tu:

```js
// docs/js/config.js
APP_CONFIG.API_URL
```

Khi doi URL `/exec`, sua gia tri `API_URL` trong `docs/js/config.js`.

API frontend mong doi du lieu dang:

```json
{
  "success": true,
  "updatedAt": "...",
  "services": [
    {
      "id": "morning",
      "label": "Buoi sang",
      "songs": ["136", "82"],
      "sermonSite": "",
      "sermonYoutube": "",
      "sermonText": "",
      "rawContent": ""
    }
  ]
}
```

Neu API loi, `success` la `false`, hoac du lieu khong hop le, trang `Trinh tao tab` se dung du lieu fallback trong `docs/js/config.js`.

## Deploy GitHub Pages

1. Vao repository tren GitHub.
2. Mo `Settings`.
3. Vao `Pages`.
4. Chon `Deploy from a branch`.
5. Chon branch `main`.
6. Chon folder `/docs`.
7. Luu cau hinh.

Toan bo duong dan frontend dang dung dang tuong doi nhu `./css/global.css` va `./js/config.js`, nen chay dung khi repository nam duoi subpath cua GitHub Pages.

## Deploy Apps Script

Apps Script chay rieng tren Google. File `backend/apps-script.gs` chi la source backup trong repo.

Khi sua backend:

1. Mo Google Apps Script project hien tai.
2. Cap nhat code theo `backend/apps-script.gs`.
3. Deploy phien ban moi.
4. Copy URL `/exec` moi neu Google tao URL moi.
5. Cap nhat `APP_CONFIG.API_URL` trong `docs/js/config.js` neu can.

## Cac page

- `docs/index.html`: Home va dieu huong chinh.
- `docs/tab-generator.html`: Tai du lieu Sabat, xem truoc danh sach tab, chon tab va mo tab bang `window.open(url, "_blank")`.
- `docs/lucky-wheel.html`: Vong quay boc tham bang HTML, CSS, JavaScript thuan, luu danh sach bang `localStorage`.
