# Atlantis Arena V2 — Görsel Yön ve Varlık Manifesti

V2 görselleri, kullanıcının referanslarındaki okunaklı 2D dövüş sahnesi ve izometrik mekân yoğunluğunu temel alan fakat hiçbir mevcut oyunu, karakteri veya markayı kopyalamayan özgün bir üretim setidir.

## Üretim modu

- Karakterler: saydam arka planlı, tam boy, premium 32-bit pixel-art/arcade cutout; 384×512 çalışma çözünürlüğüne kayıpsız-nearest işlenir.
- Ana arena: 16:9 modern spor mağazası, savaşçı ve arayüz içermeyen çevre illüstrasyonu.
- Kayak ve gemi: 16:9 savaş zemini açık bırakılmış, çok katmanlı çevre illüstrasyonları.
- Menü: sol başlık ve sağ menü kartları için negatif alanı bulunan bağımsız mağaza illüstrasyonu.
- Sosyal görsel: 1200:630 oranına uygun Atlantis Arena anahtar görseli.

## Karakter prompt seti

Her karakter için şu ortak ana prompt kullanıldı ve yalnız karakter tarifi değiştirildi:

> Create one original full-body game character cutout: [character description]. Premium 32-bit pixel-art / modern arcade fighting game sprite aesthetic, crisp deliberate pixel clusters, strong silhouette, expressive face, subtle rim light, saturated cobalt/teal palette, believable human proportions with slightly heroic stylization. Neutral three-quarter fighting stance, entire body visible including shoes, centered with generous transparent margin. No text, no logo, no watermark, no other characters, no scenery, no frame, no shadow backdrop. Transparent background. Original design, not based on any existing copyrighted character.

Karakter tarifleri `abdullah`, `gokhan`, `deniz-arda`, `duygu`, `ikra`, `selen`, `yagmur`, `emirhan`, `meltem`, `sinejan`, `merve`, `gulnihal`, `pinar`, `can`, `sude`, `yusuf`, `hazal`, `aysegul`, `beyza`, `arda` ve `ozgur-sercan` için ad, görünüş, rol ve ekipmanla ayrı ayrı özelleştirildi.

## Runtime yolları

- `public/assets/characters-v2/*.png` — 21 optimize karakter cutout'u
- `public/assets/arenas/atlantis-magaza.png` — ana mağaza arenası
- `public/assets/arenas/kayak.png` — kayak arenası
- `public/assets/arenas/gemi.png` — gemi arenası
- `public/assets/ui/store-menu.png` — ana menü arka planı
- `public/og-atlantis-arena.png` — sosyal paylaşım görseli

Tüm diğer arena ve olay varlıkları mevcut programatik üretim hattıyla korunur. V2 cutout'ları Phaser içinde nefes, wind-up, lunge, recoil, düşme, parıltı ve parçacık katmanlarıyla prosedürel olarak canlandırılır.
