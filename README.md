# Acilin Enleri — Fotoğraflı Sürüm

Statik HTML/CSS/JavaScript + Firebase uygulamasıdır. npm veya build komutu gerektirmez.

## Dosyalar

- `index.html`
- `styles.css`
- `app.js`
- `firestore.rules`
- `vercel.json`
- `photos/`

## Fotoğraflar

`photos/FOTOGRAF-DOSYA-ADLARI.txt` içindeki adlara göre 21 JPG fotoğraf ekleyin.
Fotoğraf bulunmazsa uygulama kişinin baş harflerini gösterir.

## Firebase için kritik adım

Vercel alan adını Firebase'e ekleyin:

1. Firebase Console → Authentication
2. Settings → Authorized domains
3. `acilin-enleri.vercel.app` alan adını ekleyin
4. Başka bir Vercel alan adı kullanıyorsanız onu da ekleyin

## Firestore Rules

Firebase Console → Firestore Database → Rules bölümünde `firestore.rules` içeriğini yayınlayın.

## Oylama

- 21 kişi
- 9 kategori
- Her kategori için herkes aynı 20 eşleşmeyi görür
- Toplam 180 seçim
- Anonim Firebase Auth
- Sonuçlar herkese açık
