// Statik içerik verisi — API bağımsız, gerçek bilgiler

export const MOCK_DIZILER = [
  {
    title: "Breaking Bad", originalTitle: "Breaking Bad",
    genres: ["Dram", "Suç", "Gerilim"], imdbScore: 9.5, rottenTomatoesScore: 98, letterboxdScore: 4.46,
    platforms: ["Netflix"], year: 2008,
    description: "Kanser teşhisi konan kimya öğretmeni Walter White, ailesine para bırakmak için uyuşturucu imal etmeye başlar. Güç ve para hırsı onu tanınmaz hale getirir.",
    posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    cast: [
      { name: "Bryan Cranston", character: "Walter White", profilePath: "/7Jahy5LZX2Fo8fGJltMreAI49hC.jpg" },
      { name: "Aaron Paul", character: "Jesse Pinkman", profilePath: "/2NPahEsBj6pTIBGOfGDtFRW8tYb.jpg" },
      { name: "Anna Gunn", character: "Skyler White", profilePath: "/adppyeu95gLWfBKjGjTtHABijE1.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "jc_3109", quote: "Televizyon tarihinin en iyi yapımlarından biri. Her bölüm sizi ekrana yapıştırıyor." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Televizyonun altın çağını simgeleyen başyapıt." },
    ],
  },
  {
    title: "Chernobyl", originalTitle: "Chernobyl",
    genres: ["Tarih", "Dram", "Gerilim"], imdbScore: 9.4, rottenTomatoesScore: 96, letterboxdScore: 4.43,
    platforms: ["Amazon Prime"], year: 2019,
    description: "1986 Çernobil nükleer felaketi ve ardından yaşananları gerçekçi biçimde aktaran beş bölümlük mini dizi. Kahraman bilim insanlarının mücadelesini anlatıyor.",
    posterPath: "/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg",
    cast: [
      { name: "Jared Harris", character: "Valery Legasov", profilePath: "/b2PzGIXPCBYgFpXkZUGNOmRrRlP.jpg" },
      { name: "Stellan Skarsgård", character: "Boris Shcherbina", profilePath: "/vqmNPBRrFPcEsH6OMXtmCQ7eSEU.jpg" },
      { name: "Emily Watson", character: "Ulana Khomyuk", profilePath: "/oGJQhOpT8S1M56tvSsbEBePV5O1.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "filmsevdalisi", quote: "Gerçek bir kabusu bu kadar etkileyici anlatmak için dahi olmak gerekir." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Tarihin en yıkıcı nükleer felaketini soğukkanlı bir ustalıkla aktarıyor." },
    ],
  },
  {
    title: "Band of Brothers", originalTitle: "Band of Brothers",
    genres: ["Tarih", "Dram", "Aksiyon"], imdbScore: 9.4, rottenTomatoesScore: 97, letterboxdScore: 4.47,
    platforms: ["Amazon Prime"], year: 2001,
    description: "İkinci Dünya Savaşı'nda 101. Hava İndirme Tümeni'nin Easy Bölüğü'nün Normandiya'dan Berlin'e uzanan kahramanlık hikayesi.",
    posterPath: "/zvBwADZV1jHEPxjZFajFZOFHBqH.jpg",
    cast: [
      { name: "Damian Lewis", character: "Richard Winters", profilePath: "/eIi3klFf7mp3oL5EEF4mVIMLNNk.jpg" },
      { name: "Ron Livingston", character: "Lewis Nixon", profilePath: "/yNNsV5GRVojJ8swNqvOGalK4fwC.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "tarihsever", quote: "Savaşın acımasızlığını ve kardeşliği bu kadar iyi anlatan başka yapım bilmiyorum." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Savaş dramasının zirvesi. Spielberg ve Hanks'in ellerinden öpülür." },
    ],
  },
  {
    title: "The Wire", originalTitle: "The Wire",
    genres: ["Suç", "Dram", "Gerilim"], imdbScore: 9.3, rottenTomatoesScore: 94, letterboxdScore: 4.40,
    platforms: ["Amazon Prime"], year: 2002,
    description: "Baltimore'da uyuşturucu suç örgütlerini çökertmeye çalışan polisler. Sistem eleştirisiyle örülü, katmanlı ve gerçekçi bir suç dizisi.",
    posterPath: "/4lbclFySvugI51fwsyxBTOm4DqK.jpg",
    cast: [
      { name: "Dominic West", character: "Jimmy McNulty", profilePath: "/qnsOBCiAFWd0DVNMGiCKNFQE5bS.jpg" },
      { name: "Idris Elba", character: "Stringer Bell", profilePath: "/be1bVF7qGX91a6c5WeRPs5pKMwp.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "dizisevdalisi", quote: "Amerikan televizyonunun en zirve eseri. Her sezonu ayrı bir başyapıt." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Modern Amerikan Destanı — benzersiz bir sosyal belge." },
    ],
  },
  {
    title: "Game of Thrones", originalTitle: "Game of Thrones",
    genres: ["Fantezi", "Dram", "Aksiyon"], imdbScore: 9.2, rottenTomatoesScore: 89, letterboxdScore: 4.23,
    platforms: ["HBO Max"], year: 2011,
    description: "Yedi Krallık'ın tahtı için birbiriyle savaşan güçlü aileler ve kuzeydeki gizemli tehdidin hikayesi. Epik fantezi dünyasının şaheseri.",
    posterPath: "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
    cast: [
      { name: "Emilia Clarke", character: "Daenerys Targaryen", profilePath: "/XI72Lh8HrGBHWbFqjGgEkChDvqN.jpg" },
      { name: "Kit Harington", character: "Jon Snow", profilePath: "/dYBOhkOQG3IH4kDMXHAhVkzFU6M.jpg" },
      { name: "Peter Dinklage", character: "Tyrion Lannister", profilePath: "/lRsRgnksAhBsMtAbYGnB7R6xIGN.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "fantasysever", quote: "İlk 6 sezonu televizyon tarihinin en iyileri arasında. Eşsiz prodüksiyon değeri." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Fantezi türünü televizyona taşıyan devrim niteliğinde bir yapım." },
    ],
  },
  {
    title: "The Sopranos", originalTitle: "The Sopranos",
    genres: ["Suç", "Dram"], imdbScore: 9.2, rottenTomatoesScore: 92, letterboxdScore: 4.43,
    platforms: ["HBO Max"], year: 1999,
    description: "New Jersey mafyasını yöneten Tony Soprano'nun aile hayatı ile suç dünyası arasında sıkışıp kalmasını anlatan efsane dizi.",
    posterPath: "/rTc7ZXZroqjieVeMCPblAznMSCQ.jpg",
    cast: [
      { name: "James Gandolfini", character: "Tony Soprano", profilePath: "/4VC69HNnCFeBmJbxXNpSNHhQEPo.jpg" },
      { name: "Edie Falco", character: "Carmela Soprano", profilePath: "/6mhsIeULiSrGnOVWEZoSl0trPST.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "klasiksever", quote: "Modern televizyonun babası. James Gandolfini'nin performansı tarihe geçti." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "TV dramının nasıl yazıldığını ve oynanacağını yeniden tanımladı." },
    ],
  },
  {
    title: "Succession", originalTitle: "Succession",
    genres: ["Dram", "Komedi"], imdbScore: 8.9, rottenTomatoesScore: 99, letterboxdScore: 4.36,
    platforms: ["HBO Max"], year: 2018,
    description: "Devasa bir medya imparatorluğunun kontrolü için kendi aralarında savaşan işlevsel olmayan Roy ailesinin hikayesi.",
    posterPath: "/e2X8fBfE8gBMnOqgq7KVxLvBM8Z.jpg",
    cast: [
      { name: "Brian Cox", character: "Logan Roy", profilePath: "/7SJm7hzVRigtYS6iy1wJxMxfV1Q.jpg" },
      { name: "Jeremy Strong", character: "Kendall Roy", profilePath: "/aTt6W3lh4gGWvUWgR3IJFXC2xLq.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "dramaqueen", quote: "Son 10 yılın en iyi TV dizisi. Her karakteri seviyor ve nefret ediyorsunuz." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Şekerleme gibi — bir bölüm biterken diğerini açıyorsunuz." },
    ],
  },
  {
    title: "House of the Dragon", originalTitle: "House of the Dragon",
    genres: ["Fantezi", "Dram", "Aksiyon"], imdbScore: 8.4, rottenTomatoesScore: 83, letterboxdScore: 3.78,
    platforms: ["HBO Max"], year: 2022,
    description: "Game of Thrones'un 200 yıl öncesini anlatan öncül dizi. Targaryen hanedanının iç savaşını ve ejderha savaşlarını konu alıyor.",
    posterPath: "/t9tRzsxEAObNv8bxAFAjJLLnPAk.jpg",
    cast: [
      { name: "Matt Smith", character: "Prens Daemon Targaryen", profilePath: "/mN8VKHI2LKtJEY3hYILBBFYdFj4.jpg" },
      { name: "Emma D'Arcy", character: "Prenses Rhaenyra Targaryen", profilePath: "/sR1JE5dK5u6wUNSQblBEQJrQe4H.jpg" },
      { name: "Olivia Cooke", character: "Alicent Hightower", profilePath: "/mgOIGVfBDrJeTBMD6TFPMScKRFO.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "got_fan", quote: "Game of Thrones'un en iyi dönemlerini hatırlatan, iktidar savaşlarını yeniden masaya taşıyan güçlü bir dizi." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Westeros'a geri döndük ve bu kez ejderhalar daha da vahşi." },
    ],
  },
  {
    title: "The White Lotus", originalTitle: "The White Lotus",
    genres: ["Dram", "Komedi", "Gerilim"], imdbScore: 7.9, rottenTomatoesScore: 97, letterboxdScore: 3.83,
    platforms: ["HBO Max"], year: 2021,
    description: "Lüks bir tatil beldesindeki misafirler ve çalışanlar arasındaki karanlık ilişkileri hicivli bir dille anlatan anthologie dizisi.",
    posterPath: "/iPbFGWe6Q8jVlREFzLPEP85P7bP.jpg",
    cast: [
      { name: "Jennifer Coolidge", character: "Tanya McQuoid", profilePath: "/8ggQR8PeVfJkTe0P7OtxIEqGIW1.jpg" },
      { name: "Murray Bartlett", character: "Armond", profilePath: "/3dU5eHHJlpjcSJnELMTVmTGXMzr.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "hbomax_fan", quote: "Her sezonu farklı bir lokasyonda, farklı bir kadroyla; yine de aynı keskin zekâ." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Sınıf ve ayrıcalık üzerine en iyi hicivlerden biri." },
    ],
  },
  {
    title: "Euphoria", originalTitle: "Euphoria",
    genres: ["Dram"], imdbScore: 8.4, rottenTomatoesScore: 83, letterboxdScore: 4.11,
    platforms: ["HBO Max"], year: 2019,
    description: "Madde bağımlılığı, kimlik ve travmayla boğuşan Z kuşağı ergenlerinin hayatını görsel açıdan çarpıcı bir şekilde anlatan ABD dizisi.",
    posterPath: "/3Q0hJ0GSBL6FoNdcuO7LgSwXHBB.jpg",
    cast: [
      { name: "Zendaya", character: "Rue Bennett", profilePath: "/r3A7ev5C7pOQGkxHKBE1RLqmIcZ.jpg" },
      { name: "Hunter Schafer", character: "Jules Vaughn", profilePath: "/3BQmGhLDLCjhqSsaEPlBdXSKFYu.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "genclik_draması", quote: "Zendaya bu rolde olağanüstü. Uyuşturucu bağımlılığını bu kadar gerçekçi işleyen az yapım var." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Görsel cesaret ve duygusal derinliği mükemmel harmanlayan, tartışmalı ama kaçırılmaması gereken dizi." },
    ],
  },
  {
    title: "Stranger Things", originalTitle: "Stranger Things",
    genres: ["Bilim Kurgu", "Korku", "Dram"], imdbScore: 8.7, rottenTomatoesScore: 93, letterboxdScore: 3.96,
    platforms: ["Netflix"], year: 2016,
    description: "Indiana'nın küçük kasabasında bir çocuğun kaybolması gizemli olayların fitilini ateşler. 80'lere nostaljik bir geri dönüş.",
    posterPath: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    cast: [
      { name: "Millie Bobby Brown", character: "Eleven", profilePath: "/9X95J1xhJLfWGbfOUBzWsGsKaFT.jpg" },
      { name: "Finn Wolfhard", character: "Mike Wheeler", profilePath: "/rXYBNMpRHUBMwDfQFTMJNPKHjIx.jpg" },
      { name: "Winona Ryder", character: "Joyce Byers", profilePath: "/ld7YB9nSFx7fp4DRKqT0YMqiZJn.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "scifielover", quote: "80'lerin havasını mükemmel yakalıyor. Her sezon daha da iyi." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Nostalji ve gerilimi mükemmel harmanlayan özgün bir yapım." },
    ],
  },
  {
    title: "Peaky Blinders", originalTitle: "Peaky Blinders",
    genres: ["Suç", "Dram", "Tarih"], imdbScore: 8.8, rottenTomatoesScore: 88, letterboxdScore: 4.13,
    platforms: ["Netflix"], year: 2013,
    description: "1919 Birmingham'ında Shelby ailesinin yönettiği suç örgütünün güç mücadelesi. Dönemin atmosferini olağanüstü yansıtan İngiliz yapımı.",
    posterPath: "/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg",
    cast: [
      { name: "Cillian Murphy", character: "Tommy Shelby", profilePath: "/dm6V24NjjvjMiCtbMkc8Y2WPm2e.jpg" },
      { name: "Helen McCrory", character: "Polly Gray", profilePath: "/iqhiVdOaHnyerNTmN4I3NmkWvhb.jpg" },
      { name: "Paul Anderson", character: "Arthur Shelby", profilePath: "/uepcMELqN6P9mKbEDVXYLVqbMWE.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "donem_delisi", quote: "Cillian Murphy göz açtırmıyor. Sinematografisi ve müzikleriyle başlı başına bir sanat eseri." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "İngiliz suç dramasının zirvesi." },
    ],
  },
  {
    title: "Dark", originalTitle: "Dark",
    genres: ["Bilim Kurgu", "Gerilim", "Dram"], imdbScore: 8.8, rottenTomatoesScore: 94, letterboxdScore: 4.37,
    platforms: ["Netflix"], year: 2017,
    description: "Alman kasabası Winden'da çocukların kaybolması zamanla dolaşan gizemlerin kapısını aralar. Zaman yolculuğu temalı nefes kesen Alman yapımı.",
    posterPath: "/apbrbWs5M6kEYg5eIF7YcG5TRkY.jpg",
    cast: [
      { name: "Louis Hofmann", character: "Jonas Kahnwald", profilePath: "/5UtxBqBKjAuqYGaOnuQvOD6cVU3.jpg" },
      { name: "Lisa Vicari", character: "Martha Nielsen", profilePath: "/gFy0oogCVMBHmtj8c0v2JsQfHFj.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "zamanmakinas", quote: "Zaman yolculuğu konusunda yazılmış en karmaşık ve en tatmin edici senaryo." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Amerikan yapımlarına meydan okuyan Alman televizyonunun şaheseri." },
    ],
  },
  {
    title: "Squid Game", originalTitle: "오징어 게임",
    genres: ["Dram", "Aksiyon", "Gerilim"], imdbScore: 8.0, rottenTomatoesScore: 95, letterboxdScore: 3.94,
    platforms: ["Netflix"], year: 2021,
    description: "Borçlu insanlar hayatta kalmak için ölümlü çocuk oyunları oynamak zorunda kalır. Güney Kore'nin küresel hit yapımı.",
    posterPath: "/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg",
    cast: [
      { name: "Lee Jung-jae", character: "Seong Gi-hun", profilePath: "/wBbzXtlCGLDmoCw1mJe8HAzP7TH.jpg" },
      { name: "Park Hae-soo", character: "Cho Sang-woo", profilePath: "/3hOAG4thNsRE9h2zaFt4nkdxhbp.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "kdramamasteri", quote: "Sosyal eleştiriyi eğlenceyle bu kadar iyi harmanlamak gerçekten zor." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Küresel bir fenomen olmayı hak eden, yaratıcı ve cesur bir yapım." },
    ],
  },
  {
    title: "Severance", originalTitle: "Severance",
    genres: ["Bilim Kurgu", "Gerilim", "Dram"], imdbScore: 8.7, rottenTomatoesScore: 98, letterboxdScore: 4.22,
    platforms: ["Apple TV+"], year: 2022,
    description: "İş ve özel hayatlarını beyin ameliyatıyla ayıran çalışanların distopik dünyasını anlatan yaratıcı gerilim dizisi.",
    posterPath: "/3rhNNPKp9UFEVsLiIExiGD4mV60.jpg",
    cast: [
      { name: "Adam Scott", character: "Mark Scout", profilePath: "/bkYpFHO9dBCiAtWcXFMRtS1Ol9j.jpg" },
      { name: "Patricia Arquette", character: "Harmony Cobel", profilePath: "/2Dkp7OoVKMoKmFkHYaRHeBVpqCz.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "scifimaniac", quote: "Apple TV+'ın en özgün yapımı. Her bölüm sizi bir sonrakine hazırlıyor." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Distopik kurgunun en yaratıcı ve en sinir bozucu (iyi manada) yapımı." },
    ],
  },
  {
    title: "Mindhunter", originalTitle: "Mindhunter",
    genres: ["Suç", "Gerilim", "Dram"], imdbScore: 8.6, rottenTomatoesScore: 97, letterboxdScore: 4.22,
    platforms: ["Netflix"], year: 2017,
    description: "FBI'ın seri katil profillemesi yöntemini geliştiren ajanların gerçek hikayesi. David Fincher imzalı karanlık ve büyüleyici yapım.",
    posterPath: "/vNHsHtCN3cTKtLJFGb7pINvJNln.jpg",
    cast: [
      { name: "Jonathan Groff", character: "Holden Ford", profilePath: "/7vBGMR6J3Ul1EeONmgpvVMzxNwE.jpg" },
      { name: "Holt McCallany", character: "Bill Tench", profilePath: "/7gzXJOEoqfUTvmpWrQVJMVqNUTq.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "sucsevdalisi", quote: "Fincher'ın imzası her karede hissediliyor. Psikolojik derinliği çok güçlü." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Suç janrını yeniden tanımlayan, ustalıkla yazılmış bir psikolojik drama." },
    ],
  },
  {
    title: "Better Call Saul", originalTitle: "Better Call Saul",
    genres: ["Suç", "Dram", "Komedi"], imdbScore: 9.0, rottenTomatoesScore: 98, letterboxdScore: 4.39,
    platforms: ["Netflix"], year: 2015,
    description: "Breaking Bad öncesi Jimmy McGill'in dürüst avukatlıktan suç dünyasına geçişini anlatan spin-off. Zaman zaman orijinalini geride bırakıyor.",
    posterPath: "/gFy3a2rZYrTqb7zWWEBhHTOvAYA.jpg",
    cast: [
      { name: "Bob Odenkirk", character: "Jimmy McGill / Saul Goodman", profilePath: "/jx1rX3hnvVz8f8RxnGQHIoC1Ysi.jpg" },
      { name: "Jonathan Banks", character: "Mike Ehrmantraut", profilePath: "/5LqP60raFMoMXeGiVDFh0Lk9VNj.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "breakingbadfan", quote: "Spin-off'ların nasıl yapılacağını gösteren ders kitabı niteliğinde yapım." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Son sezon itibarıyla Breaking Bad ile omuz omuza yürüyor." },
    ],
  },
  {
    title: "True Detective", originalTitle: "True Detective",
    genres: ["Suç", "Gerilim", "Dram"], imdbScore: 8.9, rottenTomatoesScore: 87, letterboxdScore: 4.39,
    platforms: ["HBO Max"], year: 2014,
    description: "Louisiana bataklıklarında 17 yıla yayılan bir cinayet soruşturmasını iki dedektifin bakış açısından anlatan yavaş yanan gerilim şaheseri.",
    posterPath: "/lEIaL12hSkqqe83zf1bANaN23Ts.jpg",
    cast: [
      { name: "Matthew McConaughey", character: "Rustin Cohle", profilePath: "/wJiGedOCZhwMx9DezY8uwbNxmAY.jpg" },
      { name: "Woody Harrelson", character: "Marty Hart", profilePath: "/2hvnMHPXFCwLSdoHHNQTDSGPV3S.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "sucsevdalisi", quote: "İlk sezon. Rust Cohle karakteri TV tarihinin en iyi karakterlerinden biri." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "McConaughey ve Harrelson'ın kimyası bu diziyi efsane yapıyor." },
    ],
  },
  {
    title: "Ozark", originalTitle: "Ozark",
    genres: ["Suç", "Dram", "Gerilim"], imdbScore: 8.4, rottenTomatoesScore: 82, letterboxdScore: 4.03,
    platforms: ["Netflix"], year: 2017,
    description: "Kartel için kara para aklamak zorunda kalan finansçı ailenin Missouri göllerindeki hayatta kalma mücadelesi.",
    posterPath: "/pCh8dZUnFXZJKBcBHGJgBrk2L0n.jpg",
    cast: [
      { name: "Jason Bateman", character: "Marty Byrde", profilePath: "/l9NUil5dHqlSTbGNqRWOC8a4FJ9.jpg" },
      { name: "Laura Linney", character: "Wendy Byrde", profilePath: "/lcNj2c0lIhm8g57T85TBEQ5VqDT.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "thriller_fan", quote: "Breaking Bad kadar karanlık olmayabilir ama kendi liginde son derece başarılı." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Jason Bateman hem yönetmen hem oyuncu olarak mükemmel." },
    ],
  },
  {
    title: "The Last of Us", originalTitle: "The Last of Us",
    genres: ["Dram", "Bilim Kurgu", "Aksiyon"], imdbScore: 8.8, rottenTomatoesScore: 96, letterboxdScore: 4.13,
    platforms: ["HBO Max"], year: 2023,
    description: "Mantar salgınının dünyayı mahvettiği distopik gelecekte bir adam, bağışık olan genç bir kızı ülke genelinde taşımaya çalışır.",
    posterPath: "/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",
    cast: [
      { name: "Pedro Pascal", character: "Joel Miller", profilePath: "/jDh25pnmSora4Oa5UyH9VvlPwsO.jpg" },
      { name: "Bella Ramsey", character: "Ellie Williams", profilePath: "/2KO1BqlpBHBuVRIr6FKoO5LYnRe.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "postapocalyptic", quote: "Oyun uyarlamaları böyle yapılır. Pedro Pascal bir kez daha efsane." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Oyun uyarlamalarının altın standardını belirliyor." },
    ],
  },
  {
    title: "Narcos", originalTitle: "Narcos",
    genres: ["Suç", "Dram", "Tarih"], imdbScore: 8.8, rottenTomatoesScore: 89, letterboxdScore: 4.11,
    platforms: ["Netflix"], year: 2015,
    description: "Uyuşturucu kaçakçısı Pablo Escobar'ın yükselişi ve DEA'nın onu çökertme çabaları. Gerçek olaylardan ilham alan sürükleyici yapım.",
    posterPath: "/rTmal9fDbwh5F0waol2hq35U4ah.jpg",
    cast: [
      { name: "Wagner Moura", character: "Pablo Escobar", profilePath: "/xD5ufFO4g3O5GhzXD8BVsJVmFD2.jpg" },
      { name: "Boyd Holbrook", character: "Steve Murphy", profilePath: "/mJHxPbdKJbOPNRJoJqXnqWO3x9E.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "sucsevdalisi", quote: "Wagner Moura'nın Escobar performansı Emmy'i hak ediyor." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Uyuşturucu savaşını insancıl ve çok boyutlu bir bakışla ele alıyor." },
    ],
  },
  {
    title: "The Crown", originalTitle: "The Crown",
    genres: ["Tarih", "Dram"], imdbScore: 8.6, rottenTomatoesScore: 90, letterboxdScore: 3.84,
    platforms: ["Netflix"], year: 2016,
    description: "İngiltere Kraliçesi II. Elizabeth'in tahttaki yıllarını ve Kraliyet ailesinin iç dinamiklerini anlatan görkemli yapım.",
    posterPath: "/1M876KPjulVwppEpldhdc8V4o68.jpg",
    cast: [
      { name: "Claire Foy", character: "Kraliçe Elizabeth II", profilePath: "/8g1F5nKFCMOJcMWv6sIGgCF9V8u.jpg" },
      { name: "Matt Smith", character: "Prens Philip", profilePath: "/mN8VKHI2LKtJEY3hYILBBFYdFj4.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "tarihsever", quote: "Kraliyet ailesinin iç dünyasına bu kadar ince işlenmiş bir bakış nadirdir." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Prodüksiyon değeri ve oyunculuklar açısından eşsiz bir dönem draması." },
    ],
  },
  {
    title: "Diriliş: Ertuğrul", originalTitle: "Diriliş: Ertuğrul",
    genres: ["Tarih", "Aksiyon", "Dram"], imdbScore: 8.1, rottenTomatoesScore: null, letterboxdScore: 3.2,
    platforms: ["Netflix"], year: 2014,
    description: "Osmanlı İmparatorluğu'nun kurucusu Osman Bey'in babası Ertuğrul Gazi'nin hayatını ve mücadelelerini anlatan epik Türk yapımı.",
    posterPath: null,
    cast: [
      { name: "Engin Altan Düzyatan", character: "Ertuğrul Gazi", profilePath: null },
      { name: "Esra Bilgiç", character: "Halime Hatun", profilePath: null },
    ],
    reviews: [
      { source: "IMDB", author: "turksevdalisi", quote: "Türk televizyon tarihinin en büyük uluslararası başarısı. Destansı anlatım." },
      { source: "IMDB", author: "tarihfanı", quote: "150'den fazla ülkede yayınlanan, küresel çapta izlenen benzersiz yapım." },
    ],
  },
  {
    title: "Siyah Beyaz Aşk", originalTitle: "Siyah Beyaz Aşk",
    genres: ["Romantik", "Dram"], imdbScore: 8.3, rottenTomatoesScore: null, letterboxdScore: 3.4,
    platforms: ["Netflix"], year: 2017,
    description: "Kör bir müzisyen ile hırçın bir boksörün beklenmedik aşkını anlatan Türk yapımı. Netflix Türkiye'nin en çok izlenen yerli dizilerinden.",
    posterPath: null,
    cast: [
      { name: "Birkan Sokullu", character: "Asım", profilePath: null },
      { name: "Dilan Çiçek Deniz", character: "Aslı", profilePath: null },
    ],
    reviews: [
      { source: "IMDB", author: "romantikruh", quote: "Türk dizisi klişelerini yıkan, içten ve duygusal bir aşk hikayesi." },
      { source: "IMDB", author: "netflixtr", quote: "Netflix Türkiye'de en çok izlenen yapımlardan biri. Başrollerden göz alamıyorsunuz." },
    ],
  },
]

export const MOCK_FILMLER = [
  {
    title: "The Shawshank Redemption", originalTitle: "The Shawshank Redemption",
    genres: ["Dram"], imdbScore: 9.3, rottenTomatoesScore: 91, letterboxdScore: 4.44,
    platforms: ["Netflix", "Amazon Prime"], year: 1994, duration: 142,
    description: "Yanlışlıkla mahkûm edilen bankacı Andy Dufresne'nin Shawshank Cezaevi'ndeki hayatta kalma ve umut hikayesi. IMDB'nin tüm zamanların en iyi filmi.",
    posterPath: "/lyQBXul3if4jD7wIvvJKiom7buI.jpg",
    cast: [
      { name: "Tim Robbins", character: "Andy Dufresne", profilePath: "/ar1GDSExAFyIDLi0rVqB5MNvs3n.jpg" },
      { name: "Morgan Freeman", character: "Ellis Boyd 'Red' Redding", profilePath: null },
    ],
    reviews: [
      { source: "IMDB", author: "filmkurdu", quote: "Her izleyişte farklı bir şey keşfediyorum. Umudun en güzel tanımı." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "İnsan ruhunun en güzel kutlaması. Zamansız bir başyapıt." },
    ],
  },
  {
    title: "The Godfather", originalTitle: "The Godfather",
    genres: ["Suç", "Dram"], imdbScore: 9.2, rottenTomatoesScore: 98, letterboxdScore: 4.51,
    platforms: ["Amazon Prime"], year: 1972, duration: 175,
    description: "Corleone ailesi üzerinden Amerikan mafyasının yükselişini ve çöküşünü anlatan sinema tarihinin başyapıtı. Coppola'nın şaheseri.",
    posterPath: "/3bhkrj58Vtu7enYsLegHzDqSBYk.jpg",
    cast: [
      { name: "Marlon Brando", character: "Vito Corleone", profilePath: "/fuTEPMDM45436zolqRw9X3FHBFR.jpg" },
      { name: "Al Pacino", character: "Michael Corleone", profilePath: "/2WlFRV5QoKVqnRoiLRwNLZtD5VL.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "sinemagurusu", quote: "Sinema yapmak budur. Her sahne bir ders niteliğinde." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Sinema tarihinin en büyük başarılarından biri — 50 yıl sonra hâlâ mükemmel." },
    ],
  },
  {
    title: "The Dark Knight", originalTitle: "The Dark Knight",
    genres: ["Aksiyon", "Suç", "Dram"], imdbScore: 9.0, rottenTomatoesScore: 94, letterboxdScore: 4.44,
    platforms: ["Netflix", "Amazon Prime"], year: 2008, duration: 152,
    description: "Joker'in Gotham'ı kaosa sürükleme planına karşı Batman'in mücadelesi. Süper kahraman türünün sınırlarını yıkan başyapıt.",
    posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    cast: [
      { name: "Christian Bale", character: "Bruce Wayne / Batman", profilePath: "/9VnMGSWLJKnMWNkIcqTbKIbqMY5.jpg" },
      { name: "Heath Ledger", character: "Joker", profilePath: "/5Y9HnYYa9jF4NunY9lSgJGjSe8E.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "batmanfan", quote: "Heath Ledger'ın Joker performansı sinema tarihinin en iyilerinden biri." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Süper kahraman filmlerinin nasıl yapılması gerektiğini gösteren şaheser." },
    ],
  },
  {
    title: "Schindler's List", originalTitle: "Schindler's List",
    genres: ["Tarih", "Dram"], imdbScore: 9.0, rottenTomatoesScore: 98, letterboxdScore: 4.47,
    platforms: ["Amazon Prime"], year: 1993, duration: 195,
    description: "Holokost sırasında Yahudi işçilerini kurtarmak için fabrikasını kullanan Oskar Schindler'in gerçek hikayesi. Spielberg'in en önemli filmi.",
    posterPath: "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
    cast: [
      { name: "Liam Neeson", character: "Oskar Schindler", profilePath: "/9mdAohLsDdAecVnu2GBNEgxQWPM.jpg" },
      { name: "Ralph Fiennes", character: "Amon Göth", profilePath: "/2WMBbkgBIZqiTRFsTI5gMiGOvAx.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "tarihsever", quote: "Bu film izlenmesi değil, yaşanması gereken bir deneyim." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Spielberg'in tüm kariyerinin zirvesi. Holokost'un en etkili sinema anlatımı." },
    ],
  },
  {
    title: "Pulp Fiction", originalTitle: "Pulp Fiction",
    genres: ["Suç", "Dram"], imdbScore: 8.9, rottenTomatoesScore: 92, letterboxdScore: 4.38,
    platforms: ["Netflix", "Amazon Prime"], year: 1994, duration: 154,
    description: "Los Angeles suç dünyasının birbirine dolaşan hikayeleri. Tarantino'nun doğrusal olmayan anlatımıyla sinema dilini yeniden yazan devrimci film.",
    posterPath: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    cast: [
      { name: "John Travolta", character: "Vincent Vega", profilePath: "/eWMqaXP2VEG8KxKXJGhWCMXvFjH.jpg" },
      { name: "Samuel L. Jackson", character: "Jules Winnfield", profilePath: "/NpvhtCkKLvKMBNK3X3GIZPjkFrE.jpg" },
      { name: "Uma Thurman", character: "Mia Wallace", profilePath: "/tgdP1GaBfmVPfYPkGRJFSKkxJj7.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "tarantinofan", quote: "Her diyalog bir şaheser. Yıllar sonra hâlâ ezberliyorum." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Bağımsız sinemanın manifestosu ve 90'ların en etkili filmi." },
    ],
  },
  {
    title: "Inception", originalTitle: "Inception",
    genres: ["Bilim Kurgu", "Aksiyon", "Gerilim"], imdbScore: 8.8, rottenTomatoesScore: 87, letterboxdScore: 4.29,
    platforms: ["Netflix", "Amazon Prime"], year: 2010, duration: 148,
    description: "Rüya içinde rüyalara girerek bilgi çalan bir hırsızın en büyük soygununu anlatıyor. Nolan'ın beyin yakan ustalık eseri.",
    posterPath: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    cast: [
      { name: "Leonardo DiCaprio", character: "Dom Cobb", profilePath: "/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg" },
      { name: "Joseph Gordon-Levitt", character: "Arthur", profilePath: "/bHGNKFE8RXWfGzNg1FpHLvLrKpq.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "nolansevdalisi", quote: "İzledikçe yeni katmanlar keşfediyorsunuz. Sinemada beyin egzersizi." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Nolan'ın en hırslı ve en tatmin edici filmi." },
    ],
  },
  {
    title: "Interstellar", originalTitle: "Interstellar",
    genres: ["Bilim Kurgu", "Dram", "Aksiyon"], imdbScore: 8.7, rottenTomatoesScore: 73, letterboxdScore: 4.24,
    platforms: ["Netflix", "Amazon Prime"], year: 2014, duration: 169,
    description: "İnsanlığın yaşayabileceği yeni bir gezegen arayışında yıldızlararası yolculuğa çıkan astronotların hikayesi. Bilim ve duygusallık dengesi.",
    posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    cast: [
      { name: "Matthew McConaughey", character: "Cooper", profilePath: "/wJiGedOCZhwMx9DezY8uwbNxmAY.jpg" },
      { name: "Anne Hathaway", character: "Brand", profilePath: "/tLelKoPNiyJCSEJpzpHFORjABFu.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "scifimaster", quote: "Akıl ve duygu arasındaki o ince çizgide dans ediyor. Muhteşem." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Nolan'ın en duygusal filmi, bilim kurgunun son 20 yılının en önemlilerinden." },
    ],
  },
  {
    title: "Fight Club", originalTitle: "Fight Club",
    genres: ["Dram", "Gerilim"], imdbScore: 8.8, rottenTomatoesScore: 79, letterboxdScore: 4.38,
    platforms: ["Netflix", "Amazon Prime"], year: 1999, duration: 139,
    description: "Sıradan bir çalışanın karizmatik yabancıyla kurduğu dövüş kulübünün kontrolden çıkmasını anlatan karanlık ve zekice film.",
    posterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    cast: [
      { name: "Brad Pitt", character: "Tyler Durden", profilePath: "/kU3B75TyRiCgE270EyZnHjfivoq.jpg" },
      { name: "Edward Norton", character: "The Narrator", profilePath: "/9kqar5FKmjkMY0RXzBbRN2xqbrE.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "kultfilm", quote: "Her zaman izlenecek ama konuşulmayacak film. İlk kural budur." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Fincher'ın en provokatif filmi, tüketim kültürünün en sert eleştirisi." },
    ],
  },
  {
    title: "Forrest Gump", originalTitle: "Forrest Gump",
    genres: ["Dram", "Romantik", "Komedi"], imdbScore: 8.8, rottenTomatoesScore: 71, letterboxdScore: 4.23,
    platforms: ["Netflix", "Amazon Prime"], year: 1994, duration: 142,
    description: "Düşük IQ'lu ama büyük kalpli Forrest Gump'ın gözünden Amerikan tarihinin önemli dönüm noktalarına tanıklık eden dokunaklı film.",
    posterPath: "/saHP97rTPS5eLmrLQECjsxWkO3N.jpg",
    cast: [
      { name: "Tom Hanks", character: "Forrest Gump", profilePath: "/xndWFsBlClOJFRdhSt4NBwiPq2o.jpg" },
      { name: "Robin Wright", character: "Jenny Curran", profilePath: "/b6ZBzKXmB0XM1hMKYoKt3x1C8kD.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "duygusalruh", quote: "Hayat bir çikolata kutusuymuş. Bu filmi izlemeden bu cümleyi anlayamazsınız." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Tom Hanks'in kariyer tanımlayan performansı ve saf duygusallığıyla benzersiz." },
    ],
  },
  {
    title: "The Matrix", originalTitle: "The Matrix",
    genres: ["Bilim Kurgu", "Aksiyon"], imdbScore: 8.7, rottenTomatoesScore: 88, letterboxdScore: 4.27,
    platforms: ["Amazon Prime"], year: 1999, duration: 136,
    description: "Gerçekliğin bir simülasyon olduğunu keşfeden bir bilgisayar korsanının insanlığı kurtarma yolculuğu. Aksiyon ve felsefeyi birleştiren efsane film.",
    posterPath: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    cast: [
      { name: "Keanu Reeves", character: "Neo", profilePath: "/rRdru6REr9i3WIHv2vWyGTzziwM.jpg" },
      { name: "Laurence Fishburne", character: "Morpheus", profilePath: "/8suOhUmPbfKqDQ17jQ1Gy0mI3P4.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "scifimaster", quote: "Kırmızı mı mavi mi hapsının kaynağı. Aksiyon tarihini değiştiren film." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Görsel efektleri ve felsefi alt metniyle çığır açan bilim kurgu başyapıtı." },
    ],
  },
  {
    title: "The Lord of the Rings: The Fellowship", originalTitle: "The Lord of the Rings: The Fellowship of the Ring",
    genres: ["Fantezi", "Aksiyon", "Dram"], imdbScore: 8.9, rottenTomatoesScore: 92, letterboxdScore: 4.49,
    platforms: ["Amazon Prime"], year: 2001, duration: 178,
    description: "Tek Yüzük'ü yok etmek için bir araya gelen dokuz yolcunun epik macerasının başlangıcı. Peter Jackson'ın şaheser serisi.",
    posterPath: "/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg",
    cast: [
      { name: "Elijah Wood", character: "Frodo Baggins", profilePath: "/7dbOFDMXa7Uv3N3lVEEF2qmO9vm.jpg" },
      { name: "Ian McKellen", character: "Gandalf", profilePath: "/lSa3HMsIVHZEQ7B3S6G3cbmMFQ.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "tolkienfan", quote: "Tolkien'in dünyasına yapılan en büyük hizmet. Epik sinemanın tanımı." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Fantezi türünü sinemada tanımlayan başyapıt." },
    ],
  },
  {
    title: "Goodfellas", originalTitle: "Goodfellas",
    genres: ["Suç", "Dram"], imdbScore: 8.7, rottenTomatoesScore: 97, letterboxdScore: 4.35,
    platforms: ["Netflix", "Amazon Prime"], year: 1990, duration: 145,
    description: "Gerçek bir mafya üyesinin hikayesinden uyarlanan Scorsese şaheseri. Amerikan organize suç dünyasının en gerçekçi portreslerinden biri.",
    posterPath: "/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg",
    cast: [
      { name: "Ray Liotta", character: "Henry Hill", profilePath: "/jABpBSg5MQfWEiBVbj2bDVLlPUw.jpg" },
      { name: "Robert De Niro", character: "Jimmy Conway", profilePath: "/cT8htcckISpI8OsaDiqetPkZFNV.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "scorsesefan", quote: "Her sahnesinde canlılık hissedilen, sizi suç dünyasına çeken başyapıt." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Scorsese'nin en tutkulu filmi. Mafya sinemasının zirvesi." },
    ],
  },
  {
    title: "The Silence of the Lambs", originalTitle: "The Silence of the Lambs",
    genres: ["Gerilim", "Suç", "Korku"], imdbScore: 8.6, rottenTomatoesScore: 96, letterboxdScore: 4.29,
    platforms: ["Amazon Prime"], year: 1991, duration: 118,
    description: "FBI stajyeri Clarice Starling'in seri katili Hannibal Lecter'dan başka bir katili yakalamak için yardım istediği psikolojik gerilim.",
    posterPath: "/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg",
    cast: [
      { name: "Jodie Foster", character: "Clarice Starling", profilePath: "/sGsNbcUVIAqxfWMoHxRsLCXLxqI.jpg" },
      { name: "Anthony Hopkins", character: "Hannibal Lecter", profilePath: "/4KrLCxBmcOBHQNqJi6fFD3UDN49.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "thrillermaster", quote: "Anthony Hopkins, yalnızca 16 dakika ekranda görünmesine rağmen Oscar kazandı. Söylemesi bile ürpertici." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Psikolojik gerilim türünün tanımlayıcı filmi." },
    ],
  },
  {
    title: "Parasite", originalTitle: "기생충",
    genres: ["Dram", "Gerilim", "Komedi"], imdbScore: 8.5, rottenTomatoesScore: 99, letterboxdScore: 4.42,
    platforms: ["Netflix", "Amazon Prime"], year: 2019, duration: 132,
    description: "Fakir bir Güney Kore ailesi zengin bir ailenin evine sızar. Sınıf farkının olağanüstü ele alındığı Oscar ödüllü Bong Joon-ho şaheseri.",
    posterPath: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    cast: [
      { name: "Song Kang-ho", character: "Kim Ki-taek", profilePath: "/a0AvUw7GlvSXLMVlZ5VEbsVg97T.jpg" },
      { name: "Lee Sun-kyun", character: "Park Dong-ik", profilePath: "/bLEWuGjhEK1gShZ0JJqKBrBe2BI.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "sinemagurusu", quote: "Sınıf çatışmasını bu kadar zekice ve eğlenceli anlatan başka film yok." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Türünü yeniden tanımlayan, En İyi Film Oscar'ını fazlasıyla hak eden şaheser." },
    ],
  },
  {
    title: "Whiplash", originalTitle: "Whiplash",
    genres: ["Dram", "Müzik"], imdbScore: 8.5, rottenTomatoesScore: 94, letterboxdScore: 4.41,
    platforms: ["Netflix", "Amazon Prime"], year: 2014, duration: 107,
    description: "Mükemmeliyetçi bir müzik öğretmeniyle hırslı genç davulcunun yoğun ilişkisini anlatan nefes kesen drama.",
    posterPath: "/7fn624j5lj3xTme2SgiLCeuedmO.jpg",
    cast: [
      { name: "Miles Teller", character: "Andrew Neiman", profilePath: "/kiGSfGTcMmBMc4f3zr6kVCDp5uP.jpg" },
      { name: "J.K. Simmons", character: "Terence Fletcher", profilePath: "/oKAhSXbMSiYIHYHxoVFCwBNEBni.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "muzisyen", quote: "Son sahne bitmeden nefes almayı unutuyorsunuz. J.K. Simmons olağanüstü." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Müzik ve tutku hakkında yapılmış en yoğun film." },
    ],
  },
  {
    title: "Gladiator", originalTitle: "Gladiator",
    genres: ["Aksiyon", "Dram", "Tarih"], imdbScore: 8.5, rottenTomatoesScore: 77, letterboxdScore: 3.87,
    platforms: ["Netflix", "Amazon Prime"], year: 2000, duration: 155,
    description: "Roma generali Maximus, imparator tarafından ailesinden ve statüsünden edilince intikam için gladyatör arenasına döner.",
    posterPath: "/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg",
    cast: [
      { name: "Russell Crowe", character: "Maximus", profilePath: "/9GBhzXMFjgcZ3FdR9w3bqMMRKOn.jpg" },
      { name: "Joaquin Phoenix", character: "Commodus", profilePath: "/nXMzvVF6A1y3ddNRnmYBTVwAB0t.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "aksiyonmaster", quote: "Are you not entertained?! Tabii ki evet. Russell Crowe kariyer zirvesinde." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Epik aksiyon sinemasının modern referans noktası." },
    ],
  },
  {
    title: "The Prestige", originalTitle: "The Prestige",
    genres: ["Dram", "Gerilim", "Bilim Kurgu"], imdbScore: 8.5, rottenTomatoesScore: 76, letterboxdScore: 4.28,
    platforms: ["Netflix"], year: 2006, duration: 130,
    description: "İki rakip sihirbazın birbirinin sırlarını çalmak için yaşadığı karanlık mücadele. Nolan'ın en zekice kurgulanmış filmi.",
    posterPath: "/5MXyQfz8xkjjqdk84tdhSSIW8kP.jpg",
    cast: [
      { name: "Christian Bale", character: "Alfred Borden", profilePath: "/9VnMGSWLJKnMWNkIcqTbKIbqMY5.jpg" },
      { name: "Hugh Jackman", character: "Robert Angier", profilePath: "/nBsLHVe48dzHRhZnBlT16Bip9Dv.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "nolansevdalisi", quote: "İzledikten sonra anında baştan izlemek istediğiniz ender filmlerden." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Nolan'ın en ustalıklı senaryo çalışması." },
    ],
  },
  {
    title: "Joker", originalTitle: "Joker",
    genres: ["Dram", "Suç", "Gerilim"], imdbScore: 8.4, rottenTomatoesScore: 69, letterboxdScore: 3.93,
    platforms: ["Netflix", "Amazon Prime"], year: 2019, duration: 122,
    description: "Arthur Fleck'in kaosa dönüşen hayatının onu efsanevi kötü adama nasıl dönüştürdüğünün karanlık ve rahatsız edici hikayesi.",
    posterPath: "/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
    cast: [
      { name: "Joaquin Phoenix", character: "Arthur Fleck / Joker", profilePath: "/nXMzvVF6A1y3ddNRnmYBTVwAB0t.jpg" },
      { name: "Robert De Niro", character: "Murray Franklin", profilePath: "/cT8htcckISpI8OsaDiqetPkZFNV.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "jokerharry", quote: "Joaquin Phoenix bu rol için Oscar'ı hak ediyordu ve aldı. Olağanüstü." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Konforlu olmayan ama gerekli bir film. Phoenix hayatının rolünde." },
    ],
  },
  {
    title: "Dune: Part One", originalTitle: "Dune: Part One",
    genres: ["Bilim Kurgu", "Aksiyon", "Dram"], imdbScore: 8.0, rottenTomatoesScore: 83, letterboxdScore: 4.08,
    platforms: ["Amazon Prime", "Netflix"], year: 2021, duration: 155,
    description: "Değerli bir kaynağı kontrol eden çöl gezegeninde güç mücadelesi veren noble ailelerinin epik bilim kurgu destanı.",
    posterPath: "/d5NXSklpcvAFmMd5FvT7yXHQ64V.jpg",
    cast: [
      { name: "Timothée Chalamet", character: "Paul Atreides", profilePath: "/BE2sdjpgsa2rNTFa66f7upkaOP.jpg" },
      { name: "Zendaya", character: "Chani", profilePath: "/r3A7ev5C7pOQGkxHKBE1RLqmIcZ.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "scifiepic", quote: "Villeneuve, Dune'u hak ettiği şekilde anlatıyor. Görsel şölen." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Bilim kurgu destanının en görkemli sinema uyarlaması." },
    ],
  },
  {
    title: "Oppenheimer", originalTitle: "Oppenheimer",
    genres: ["Tarih", "Dram", "Biyografi"], imdbScore: 8.3, rottenTomatoesScore: 93, letterboxdScore: 4.28,
    platforms: ["Amazon Prime"], year: 2023, duration: 180,
    description: "Atom bombasının babası J. Robert Oppenheimer'ın hayatını ve Manhattan Projesi'ni anlatan Nolan'ın son şaheseri.",
    posterPath: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    cast: [
      { name: "Cillian Murphy", character: "J. Robert Oppenheimer", profilePath: "/dm6V24NjjvjMiCtbMkc8Y2WPm2e.jpg" },
      { name: "Emily Blunt", character: "Kitty Oppenheimer", profilePath: "/9lpFlHJDwuAzFGZRBSbMgMczlOt.jpg" },
      { name: "Robert Downey Jr.", character: "Lewis Strauss", profilePath: "/1YjdSym1jTG7xjHSI0yGGWEsw5i.jpg" },
    ],
    reviews: [
      { source: "IMDB", author: "tarihfilmseveri", quote: "Cillian Murphy kariyer tanımlayan bir performans sergiledi. 3 saat yetmez." },
      { source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Nolan'ın en olgun ve en kapsamlı filmi. Oscar'a layık bir başyapıt." },
    ],
  },
]

export const MOCK_TREND = [
  {
    title: "Squid Game", originalTitle: "오징어 게임",
    type: "dizi", genres: ["Dram", "Aksiyon"], imdbScore: 8.0,
    platforms: ["Netflix"], year: 2021, socialScore: 98,
    trendReason: "2. sezonu yayında, TikTok'ta 50B+ görüntüleme, global gündem",
    description: "Borçlu insanların ölümlü çocuk oyunları oynadığı distopik yarışma.",
    posterPath: "/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg",
    cast: [{ name: "Lee Jung-jae", character: "Gi-hun", profilePath: null }],
    reviews: [{ source: "IMDB", author: "global_watcher", quote: "İkinci sezon beklentiyi karşıladı. Bir kez başlayınca bırakamıyorsunuz." }],
  },
  {
    title: "The Last of Us", originalTitle: "The Last of Us",
    type: "dizi", genres: ["Dram", "Aksiyon"], imdbScore: 8.8,
    platforms: ["HBO Max"], year: 2023, socialScore: 96,
    trendReason: "2. sezon başladı, Pedro Pascal tartışmaları Twitter TR'de günlerce devam etti",
    description: "Mantar salgınında bir adamın bağışık genç kızı koruma hikayesi.",
    posterPath: "/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",
    cast: [{ name: "Pedro Pascal", character: "Joel", profilePath: "/jDh25pnmSora4Oa5UyH9VvlPwsO.jpg" }],
    reviews: [{ source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Oyun uyarlamalarının yeni standardı." }],
  },
  {
    title: "Severance", originalTitle: "Severance",
    type: "dizi", genres: ["Bilim Kurgu", "Gerilim"], imdbScore: 8.7,
    platforms: ["Apple TV+"], year: 2022, socialScore: 87,
    trendReason: "2. sezon finale yaklaşırken teoriler sosyal medyada patladı",
    description: "İş ve özel hayatı beyin ameliyatıyla ayıran çalışanların distopik dünyası.",
    posterPath: "/3rhNNPKp9UFEVsLiIExiGD4mV60.jpg",
    cast: [{ name: "Adam Scott", character: "Mark", profilePath: null }],
    reviews: [{ source: "IMDB", author: "scifiaddict", quote: "Her bölüm yeni sorular bırakıyor. Çıldırtıcı derecede iyi." }],
  },
  {
    title: "House of the Dragon", originalTitle: "House of the Dragon",
    type: "dizi", genres: ["Fantezi", "Dram"], imdbScore: 8.4,
    platforms: ["HBO Max"], year: 2022, socialScore: 85,
    trendReason: "2. sezon ile birlikte ejderha savaşları sosyal medyada tartışma yarattı",
    description: "Game of Thrones öncülü: Targaryen hanedanının iç savaşı.",
    posterPath: "/t9tRzsxEAObNv8bxAFAjJLLnPAk.jpg",
    cast: [{ name: "Matt Smith", character: "Daemon Targaryen", profilePath: null }],
    reviews: [{ source: "IMDB", author: "got_fan", quote: "GOT'un en iyi dönemlerini hatırlatan güçlü geri dönüş." }],
  },
  {
    title: "Oppenheimer", originalTitle: "Oppenheimer",
    type: "film", genres: ["Tarih", "Dram"], imdbScore: 8.3,
    platforms: ["Amazon Prime"], year: 2023, socialScore: 94,
    trendReason: "Barbenheimer fenomeni hâlâ gündemde, 7 Oscar'lı film streaming'e geldi",
    description: "Atom bombasının babası Oppenheimer'ın epik biyografisi.",
    posterPath: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    cast: [{ name: "Cillian Murphy", character: "Oppenheimer", profilePath: "/dm6V24NjjvjMiCtbMkc8Y2WPm2e.jpg" }],
    reviews: [{ source: "IMDB", author: "oscarsevdalisi", quote: "Cillian Murphy'nin performansı tarihe geçti." }],
  },
  {
    title: "Dune: Part Two", originalTitle: "Dune: Part Two",
    type: "film", genres: ["Bilim Kurgu", "Aksiyon"], imdbScore: 8.5,
    platforms: ["Netflix", "Amazon Prime"], year: 2024, socialScore: 89,
    trendReason: "Zendaya ve Timothée Chalamet performansları Instagram'ı salladı",
    description: "Paul Atreides'in Fremen'lerle birlikte savaşını anlatan epik devam filmi.",
    posterPath: "/8b8R8l88Qje9dn9OE8PY05Nxl1Z.jpg",
    cast: [{ name: "Timothée Chalamet", character: "Paul Atreides", profilePath: null }],
    reviews: [{ source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Birinciden de iyi. Yılın en büyük filmi." }],
  },
  {
    title: "The Bear", originalTitle: "The Bear",
    type: "dizi", genres: ["Dram", "Komedi"], imdbScore: 8.7,
    platforms: ["Disney+"], year: 2022, socialScore: 88,
    trendReason: "Emmy rekorları kırdı, şef kültürü TikTok'ta viral oldu",
    description: "Fine dining dünyasından Chicago'ya dönen şefin ağabeyin restoranını kurtarma hikayesi.",
    posterPath: "/sYNKdlZxBMGHv1TVYQ3nkPMPwaj.jpg",
    cast: [{ name: "Jeremy Allen White", character: "Carmen 'Carmy' Berzatto", profilePath: null }],
    reviews: [{ source: "Rotten Tomatoes", author: "Eleştirmen", quote: "Mutfak ve insan ilişkilerini bu kadar gerçekçi anlatan başka dizi yok." }],
  },
  {
    title: "Stranger Things", originalTitle: "Stranger Things",
    type: "dizi", genres: ["Bilim Kurgu", "Korku"], imdbScore: 8.7,
    platforms: ["Netflix"], year: 2016, socialScore: 91,
    trendReason: "Final sezonu yaklaşırken trailer sosyal medyayı yaktı",
    description: "Indiana'da gizemli olaylar ve Ters Dünya'nın hikayeleri.",
    posterPath: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    cast: [{ name: "Millie Bobby Brown", character: "Eleven", profilePath: null }],
    reviews: [{ source: "IMDB", author: "netflixaddict", quote: "Final sezona hazır değilim ama hazır olmak zorundayım." }],
  },
  {
    title: "Gladiator II", originalTitle: "Gladiator II",
    type: "film", genres: ["Aksiyon", "Tarih"], imdbScore: 7.0,
    platforms: ["Amazon Prime"], year: 2024, socialScore: 80,
    trendReason: "Ridley Scott geri döndü, Paul Mescal'ın performansı sosyal medyada takdirle karşılandı",
    description: "Lucius'un Roma'ya karşı intikam için arenaya girdiği güçlü devam filmi.",
    posterPath: "/2cxhvwyE0RYvazvYBl9ngyGqfuG.jpg",
    cast: [{ name: "Paul Mescal", character: "Lucius", profilePath: null }],
    reviews: [{ source: "IMDB", author: "gladiatorfan", quote: "İlki kadar iyi olmayabilir ama salondan çıkarken tatmin oluyorsunuz." }],
  },
  {
    title: "Diriliş: Ertuğrul", originalTitle: "Diriliş: Ertuğrul",
    type: "dizi", genres: ["Tarih", "Aksiyon"], imdbScore: 8.1,
    platforms: ["Netflix"], year: 2014, socialScore: 83,
    trendReason: "150 ülkede izleniyor, yurt dışında Türk dizisi denince akla gelen ilk yapım",
    description: "Osmanlı'nın kurucusu Osman Bey'in babası Ertuğrul Gazi'nin destanı.",
    posterPath: null,
    cast: [{ name: "Engin Altan Düzyatan", character: "Ertuğrul", profilePath: null }],
    reviews: [{ source: "IMDB", author: "globalfan", quote: "Türk tarihini tüm dünyaya tanıtan efsanevi yapım." }],
  },
]

// Tüm içeriği tek listede — arama için
export const ALL_CONTENT = [
  ...MOCK_DIZILER.map(d => ({ ...d, type: 'dizi' })),
  ...MOCK_FILMLER.map(f => ({ ...f, type: 'film' })),
]
