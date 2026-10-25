# Источники и лицензии

## Изображения

- `prototype/assets/panorama.webp`: художественная визуализация вымышленного океанариума, создана встроенным инструментом OpenAI ImageGen 24.10.2026. Это не фотография реального места или животного. Исходный промпт — `photos/panorama-prompt.md`. PNG преобразован в WebP; на сайте изображение кадрируется под экран.

## Шрифты

- Manrope: Mikhail Sharanda, Mirko Velimirović. SIL Open Font License 1.1. Лицензия в `assets/fonts/OFL-Manrope.txt`, локальные файлы из исходного `site-template`.
- Prata: Cyreal. SIL Open Font License 1.1, `prototype/assets/OFL-Prata.txt`.
- Cormorant Garamond: Christian Thalmann. SIL Open Font License 1.1, `prototype/assets/OFL-Cormorant-Garamond.txt`.
- Oranienbaum: Oleg Pospelov, Jovanny Lemonad. SIL Open Font License 1.1, `prototype/assets/OFL-Oranienbaum.txt`.
- Последние три гарнитуры перенесены из лицензированных локальных файлов `site-aly`, чтобы сравнить варианты на настоящей странице прототипа.

## Графика и тексты

- Четыре эскиза знака и линейные элементы интерфейса написаны в SVG для этого концепта. Финальный знак не выбран.
- Краткое описание океанической манты: [NOAA Fisheries — Giant Manta Ray](https://www.fisheries.noaa.gov/species/giant-manta-ray), проверено 24.10.2026. Использованы только сведения о форме плавников, преимущественно планктонном рационе и индивидуальном рисунке пятен. Фотографии и иллюстрации NOAA не копировались.


## Полный сайт, 24–25.10.2026

Восемь бесплатных моделей и обязательная атрибуция перечислены в `src/data/credits.ts` и на странице `/credits/`. Метаданные исходных GLB сохранены в `docs/licenses/`. CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ ; CC0: https://creativecommons.org/publicdomain/zero/1.0/ . Изменения: нормализация масштаба и ориентации, оптимизация геометрии/текстур, общие освещаемые материалы; удаление служебных кубов из медузы и осьминога при показе.

- `public/media/panorama.webp`: исходная художественная панорама, аварийный статичный кадр.
- `public/media/environment.webp`: промежуточная версия среды, сохранена как материал работы.
- `public/media/backdrop-unlit.webp`: среда без животных и запечённых лучей, OpenAI ImageGen. Промпт: `photos/environment-prompt.md`. С 25.10.2026 по нему восстановлен 3D-рельеф дна `public/models/seabed.glb` и карта мелкого рельефа `public/media/seabed/photo-detail.webp` (как — в `scripts/seabed/README.md`). Глубина оценена моделью Depth Anything V2 Small, Apache-2.0 (https://huggingface.co/depth-anything/Depth-Anything-V2-Small-hf); сама модель на сайт не входит.
- `public/media/seabed/rock-*.webp`: Rock Pitted Mossy, Poly Haven (фото Dimitrios Savva, обработка Rico Cilliers), CC0, https://polyhaven.com/a/rock_pitted_mossy . Карты 1K, WebP.
- `public/media/seabed/sand-*.webp`: Coast Sand 05, Poly Haven (фото Rob Tuytel, обработка Dario Barresi), CC0, https://polyhaven.com/a/coast_sand_05 . Уменьшено до 512 px, WebP.
- `public/media/species/seahorse.webp`: художественная иллюстрация морского конька, OpenAI ImageGen, не документальная фотография. Цвет приведён к воде сцены (поглощение красного, синяя дымка).
- Остальные `public/media/species/*.webp`: собственные снимки бесплатных 3D-моделей в подводной сцене сайта (рельеф дна, свет, дымка воды; `src/components/HabitatStudio.tsx`, `scripts/render-species.mjs`), сохраняют атрибуцию исходных моделей.
- `public/fonts/`: Manrope, SIL OFL 1.1; применяется в текущем сайте. Варианты Prata/Cormorant/Oranienbaum остались только в историческом прототипе.
- Текущий знак — панорамное окно с волной, собственная SVG-графика концепта.

Сведения о животных и ссылки на научные источники: `src/data/ocean.ts` и соответствующие страницы атласа. Великая белая акула показывается только как виртуальное знакомство, не как обещание содержания в океанариуме.
