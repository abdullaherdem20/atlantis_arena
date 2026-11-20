# Atlantis Arena

Atlantis Arena, mağaza departmanlarından ve eğlenceli mağaza olaylarından esinlenen, tamamen Türkçe bir 2D pixel-art 5v5 auto battler RPG’dir. Oyuncu 1 yönetici ve 4 sporcu danışmanından oluşan takımını kurar, arena avantajını seçer ve seed’li yapay zekâ savaşını izler.

## Öne çıkanlar

- 21 benzersiz karakter, 25 arena ve 37 mağaza olayı
- Aynı seed ile aynı sonucu üreten, görsel katmandan bağımsız TypeScript savaş motoru
- Dört takımlı yarı final/final turnuvası; aynı karakter hiçbir takımda kopyalanmaz
- Phaser 3 ile çalışan sinematik pixel-art savaş sahnesi ve 21 yüksek çözünürlüklü V2 karakter cutout'u
- VS geri sayımı, tahmini kazanma yüzdesi, her tur olay çarkı/kartı ve okunabilir savaş temposu
- Seed'li performans günü sistemi: Kötü, Normal, İyi ve Efsanevi Gün
- Web Audio API ile özgün chiptune müzik ve arcade ses efektleri
- LocalStorage savaş geçmişi, açılan arenalar ve kalıcı ayarlar
- Masaüstü, mobil portre/yatay, tam ekran, hareket azaltma ve düşük grafik modu

## Kurulum

Node.js 20 veya daha yeni bir sürüm önerilir.

PowerShell script çalıştırmayı engelliyorsa Windows'ta `npm` yerine doğrudan `npm.cmd` kullanın:

```powershell
npm.cmd install
npm.cmd run dev
```

Komut İstemi, macOS veya Linux üzerinde standart `npm install` ve `npm run dev` komutları da çalışır.

`npm install` sonundaki `postinstall` adımı repoda bulunan V2 varlıklarını korur; yalnız zorunlu temel dosyalar eksikse programatik yedek varlıkları üretir. Programatik V1 varlıklarını bilinçli olarak yeniden üretmek için `npm run assets` kullanabilirsiniz.

## Production build

```bash
npm run build
```

Statik çıktı `dist/` klasörüne yazılır ve herhangi bir statik hosting hizmetinde çalışır. Backend veya kullanıcı hesabı gerekmez. Vercel için kök dizini seçmek yeterlidir; depodaki `vercel.json` Vite build ve SPA yönlendirmesini hazırlar.

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

## Testler

```bash
npm run test
```

Test paketi veri bütünlüğü, takım kuralları, seed determinismi, performans günleri, enerji/HP sınırları, elenme kuralları, Kardeş Gücü, Yusuf’un alarm bağışıklığı, LocalStorage ve 10.000 otomatik savaş simülasyonunu kapsar.

## Oyun mekanikleri

1. Tam 1 yönetici ve 4 danışman seçilir.
2. Kalan karakterlerden çakışmasız üç rakip takım ve bir yedek üretilir.
3. Arena seçilir; avantaj yalnız uygun departmana uygulanır.
4. Her turun başında tam bir mağaza olayı seçilir.
5. Tur başında hayatta olan bütün karakterler hız sırasına göre bir ana aksiyon yapar.
6. Normal saldırı enerji kazandırır; 50 enerji özel güç, 100 enerji ultimate kullanımını açar.
7. 15. turdan sonra hasarı kademeli artıran Mağaza Kapanıyor sistemi savaşın sonlanmasını sağlar.
8. Galip finale çıkar ve yeni bir arena seçer.

Savaş hızı yalnız animasyon zamanını değiştirir; hesaplama sonucu değişmez.

## Yeni karakter ekleme

1. `src/data/characters.ts` dosyasına benzersiz `id` ile yeni `Character` girdisi ekleyin.
2. `scripts/generate-assets.mjs` içindeki `characterSeeds` dizisine aynı `id` için görsel palet ekleyin.
3. Gerekliyse özel destek davranışını `src/game/combat/engine.ts` içindeki `teamSupport` fonksiyonuna veri odaklı yeni bir durum olarak ekleyin.
4. `npm run assets` ve `npm run test` çalıştırın.

## Yeni arena ekleme

1. `src/data/arenas.ts` dosyasına arena bonusunu ve paletini ekleyin.
2. `scripts/generate-assets.mjs` içindeki `arenaSeeds` listesine aynı `id` ile arka plan türünü ekleyin.
3. `npm run assets` çalıştırın. Savaş motorunun değiştirilmesi gerekmez.

## Yeni mağaza olayı ekleme

1. `src/data/events.ts` dosyasına olayın adı, nadirliği, açıklaması ve varsa karakter koşulunu ekleyin.
2. Etki yeni bir mekanik gerektiriyorsa `applyEvent` içine ilgili etkiyi ekleyin.
3. Olay ikonu için `scripts/generate-assets.mjs` içindeki olay sayısını artırın ve varlıkları yenileyin.
4. Olay dağılımı testlerini güncelleyin.

## Mimari notlar

- React, menüler ve oyun akışını yönetir.
- Phaser yalnız savaşın görsel sunumunu yapar; sonucu değiştirmez.
- `src/game/combat/engine.ts` saf ve deterministik savaş hesaplamasını içerir.
- Bütün içerik `src/data/` altında merkezi olarak yönetilir.
- V1 programatik görseller çevrimdışı yeniden üretilebilir; V2 insan ve ana arena çizimleri özgün üretim varlıkları olarak repoda tutulur.
- Resmî marka logosu yerine özgün metin tabanlı Atlantis Arena marka alanı kullanılır.

Lisans ve varlık bilgisi için [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) dosyasına bakın.
