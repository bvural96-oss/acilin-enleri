# Acilin Enleri

Anonim, ikili karşılaştırmalı grup oylaması.

## Kurulum

1. Firebase Console'da yeni proje oluştur.
2. Authentication > Sign-in method bölümünden **Anonymous** girişini aç.
3. Firestore Database oluştur.
4. Firestore Rules bölümüne `firestore.rules` dosyasındaki kuralları yapıştır ve yayınla.
5. Project Settings > Your apps > Web app oluştur ve Firebase ayarlarını al.
6. `.env.example` dosyasını `.env` olarak kopyalayıp değerleri doldur.
7. Bilgisayarda çalıştır:

```bash
npm install
npm run dev
```

## Vercel

- GitHub reposunu Vercel'e import et.
- Settings > Environment Variables bölümüne `.env` içindeki 6 değişkeni ekle.
- Deploy et.

## Notlar

- Her cihaz Firebase Anonymous Auth ile ayrı bir kullanıcı olur.
- Aynı kullanıcı aynı eşleşmeye ikinci kez oy veremez.
- Sonuçlar herkese açıktır; bireysel oy sahibinin adı tutulmaz.
- Fotoğraf desteği daha sonra `people` yapısına `image` alanı eklenerek eklenebilir.
