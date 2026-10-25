import sys, numpy as np
from PIL import Image
from transformers import pipeline
img=Image.open(sys.argv[1]).convert('RGB')
for name in sys.argv[3:]:
  pipe=pipeline('depth-estimation',model=name,device='cpu')
  out=pipe(img)
  d=np.array(out['predicted_depth'].squeeze().float().numpy())
  print(name,d.shape,d.min(),d.max())
  np.save(sys.argv[2]+'-'+name.split('/')[-1]+'.npy',d)
  v=(d-d.min())/(d.max()-d.min());Image.fromarray((v*255).astype('uint8')).resize(img.size).save(sys.argv[2]+'-'+name.split('/')[-1]+'.png')
