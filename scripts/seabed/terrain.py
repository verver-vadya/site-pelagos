# Reconstructs the seabed relief of the source panorama as a world-space heightfield.
import numpy as np, json, sys
from PIL import Image
from scipy.ndimage import gaussian_filter, median_filter, grey_closing, maximum_filter
import os
P=os.environ.get('SEABED_WORK','.seabed/')   # depth .npy files, backdrop PNG, outputs
# Depth Anything V2 Small (Apache-2.0) on the glass area (846x1604 crop of the 1672x941 frame),
# rescaled to the units the calibration below was tuned in.
d=np.load(P+'wdepth-Depth-Anything-V2-Small-hf.npy')*60.36-8.66
# skyline: the first strong jump in depth from the top of each column
ds=gaussian_filter(d,1.2);g=(np.roll(ds,-3,0)-np.roll(ds,3,0))/np.maximum(ds,1)
top0=np.full(d.shape[1],d.shape[0]-1)
for x in range(d.shape[1]):
  hit=np.nonzero(g[330:d.shape[0]-4,x]>.09)[0]
  if len(hit):top0[x]=330+hit[0]
top0=median_filter(top0,9)
FW,FH=1672,941
d=np.pad(d[:,:1590],((0,FH-d.shape[0]),(0,FW-1590)),mode='edge')   # glass frame and floor strip: continue the reef
H,W=d.shape; cx,cy=FW/2,FH/2; t=np.tan(np.radians(20))
CAM=np.array([0,0,15.]); GROUND=-6.
# 1/Z=A*d+B, fitted on two seabed points (sand at 1150,700 and floor at 800,835)
A,B=0.000382,-0.0076
# skyline: depth-jump detection on the right, hand-traced on the hazy left
top=top0.astype(float)
top=np.concatenate([top[:1590],top[1589]-np.arange(1,FW-1590+1)*.4])
left=[(0,555),(60,560),(130,600),(160,625),(250,660),(380,680),(450,690),(520,700),(580,684),(625,680)]
lx,ly=zip(*left); xs=np.arange(W)
top[:626]=np.interp(xs[:626],lx,ly)
top[895:905]=np.interp(xs[895:905],[894,905],[top[894],top[905]])   # remove a one-column spike
top=gaussian_filter(top,1.5)
EXT=700
d=np.concatenate([d[:,EXT:0:-1],d,d[:,-2:-EXT-2:-1]],axis=1)
top=np.concatenate([top[EXT:0:-1],top,top[-2:-EXT-2:-1]])
W=d.shape[1];xs=np.arange(W)-EXT
ys=np.arange(H)[:,None]+.5; xx=xs[None,:]+.5
mask=ys>=top[None,:]
ray=(ys-cy)/cy*t
Zg=np.where(ray>1e-3,(CAM[1]-GROUND)/np.maximum(ray,1e-3),1e9)
Z=1/np.maximum(A*gaussian_filter(d,1.)+B,1e-4)
# the haze on the left fools the depth model: stand those mounds on the seabed instead
rowZ=lambda y:(CAM[1]-GROUND)/np.maximum((y-cy)/cy*t,1e-3)
leftZ=rowZ(top+30)[None,:]*np.ones((H,1))
blend=np.clip((xx-560)/120,0,1)
Z=Z*blend+leftZ*(1-blend)
Z=np.minimum(Z,Zg); Z=np.clip(Z,6.5,95)
X=(xx-cx)/cy*t*Z; Y=-(ys-cy)/cy*t*Z+CAM[1]; WZ=CAM[2]-Z
print('Z range on rocks',np.percentile(Z[mask],[1,50,99]))
# heightfield
x0,x1,z0,z1,c=-36.,36.,-85.,12.,.07
nx,nz=int((x1-x0)/c)+1,int((z1-z0)/c)+1
h=np.full((nz,nx),-np.inf)
def splat(px,py,pz):
  i=np.round((pz-z0)/c).astype(int); j=np.round((px-x0)/c).astype(int)
  ok=(i>=0)&(i<nz)&(j>=0)&(j<nx)
  np.maximum.at(h,(i[ok],j[ok]),py[ok])
mx,my,mz,mZ=X[mask],Y[mask],WZ[mask],Z[mask]
splat(mx,my,mz)
# rock backs: continue each visible point away from the camera, rounding down
dirx,dirz=mx/np.maximum(mZ,1e-3),-np.ones_like(mx)
n=np.hypot(dirx,dirz); dirx/=n; dirz/=n
L=np.clip((my-GROUND)*.55,.4,3.2)
for k in np.linspace(.05,1,18):
  splat(mx+dirx*L*k,my-(my-GROUND)*k**2*.85,mz+dirz*L*k)
# rounded masses under the skyline, so rocks read as boulders rather than walls
for x in range(0,W,3):
  fx_=x-EXT
  y=int(round(top[x]))
  if y>=H-1 or not mask[min(y+2,H-1),x]: continue
  px,py,pz=X[min(y+2,H-1),x],Y[min(y+2,H-1),x],WZ[min(y+2,H-1),x]
  r=np.clip((py-GROUND)*(1.9 if fx_<640 else 1.1),.8,6.)
  gi=np.arange(int((pz-r-z0)/c),int((pz+r-z0)/c)+1);gj=np.arange(int((px-r-x0)/c),int((px+r-x0)/c)+1)
  gi=gi[(gi>=0)&(gi<nz)];gj=gj[(gj>=0)&(gj<nx)]
  if len(gi)==0 or len(gj)==0: continue
  GZ=z0+gi[:,None]*c;GX=x0+gj[None,:]*c
  q=np.hypot(GX-px,(GZ-pz)*(1.6 if fx_<640 else 1.))/r
  dome=py-(py-GROUND)*np.clip(q,0,1)**1.6
  sub=h[np.ix_(gi,gj)];h[np.ix_(gi,gj)]=np.maximum(sub,np.where(q<1,dome,-np.inf))
filled=np.isfinite(h)
h=np.where(filled,h,GROUND)
h=grey_closing(h,size=(13,7))
# seabed: soft dunes, slightly lower in the sandy corridor
gz=np.arange(nz)[:,None]*c+z0; gx=np.arange(nx)[None,:]*c+x0
dunes=GROUND+np.sin(gx*.23+gz*.11)*.12+np.cos(gz*.3)*.08
h=np.maximum(h,dunes)
h=gaussian_filter(h,.8)
rng=np.random.default_rng(7)
def fbm(shape,oct=5):
  out=np.zeros(shape);amp=1.
  for o in range(oct):
    s=2**o; n=gaussian_filter(rng.standard_normal(shape),max(18/s,.6))
    out+=n/np.abs(n).max()*amp; amp*=.55
  return out
rockiness=np.clip((h-dunes)/.6,0,1)
h=h+fbm(h.shape,6)*.16*rockiness+fbm(h.shape,3)*.03
np.save(P+'terrain/height.npy',h.astype(np.float32))
json.dump({'x0':x0,'x1':x1,'z0':z0,'z1':z1,'cell':c,'nx':nx,'nz':nz},open(P+'terrain/grid.json','w'))
v=(h-h.min())/(h.max()-h.min()); Image.fromarray((v[::-1]*255).astype('uint8')).save(P+'terrain/height.png')
print('height range',h.min(),h.max(),'grid',nx,nz)
# Fine relief of the photograph (luminance against its local average), sampled in the
# shader through the reference camera. 128 = neutral; water and the glass frame stay neutral.
img=np.array(Image.open(P+'backdrop-unlit.png').convert('L')).astype(float)+2
ratio=img/gaussian_filter(img,7)
full=mask[:,EXT:EXT+FW].copy()
soft=gaussian_filter(full.astype(float),3)
fy=np.clip((842-np.arange(FH))/60,0,1)[:,None];fx=np.clip((1598-np.arange(FW))/60,0,1)[None,:]
soft*=fy*fx
detail=1+(np.clip(ratio,.35,1.9)-1)*soft
Image.fromarray(np.clip(detail*128,0,255).astype('uint8')).save(os.path.join(os.path.dirname(__file__),'../../public/media/seabed/photo-detail.webp'),quality=88)
print('detail range',np.percentile(detail[full],[2,50,98]))
