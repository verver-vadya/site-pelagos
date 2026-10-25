# Рельеф дна из исходной панорамы

`public/models/seabed.glb` и `public/media/seabed/photo-detail.webp` собраны из `public/media/backdrop-unlit.webp`, чтобы камни в 3D стояли там же, где на исходном кадре.

1. `depth.py` — карта глубины области стекла (кадр 1604×846 из 1672×941) моделью Depth Anything V2 Small (Apache-2.0). Нужны `torch`, `transformers`, `pillow`.
   `python depth.py window.png .seabed/wdepth depth-anything/Depth-Anything-V2-Small-hf`
2. `terrain.py` — калибрует глубину по плоскости дна (камера сцены: (0, 0, 15), вертикальный угол 40°, дно y = −6), находит силуэт камней, переносит точки в мир и собирает карту высот 72×97 единиц с шагом 0,07. Левая часть кадра в дымке ставится на дно по силуэту, а не по глубине модели. Кадр продолжен зеркально в стороны для экранов шире 16:9. Тут же сохраняется `photo-detail.webp`: мелкий рельеф фото (яркость относительно локального среднего), его шейдер проецирует обратно через ту же камеру. Нужны `numpy`, `scipy`, `pillow`; рабочая папка — `SEABED_WORK`.
3. `export-terrain.mjs` — сетка в glTF, `weld` + `simplify` (meshoptimizer) до ~85 тыс. треугольников.
   `node scripts/seabed/export-terrain.mjs .seabed/h32.npy .seabed/grid.json public/models/seabed.glb .03`

Фактуры камня и песка — Poly Haven, CC0 (`CREDITS.md`).
