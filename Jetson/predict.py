import torch
from torchvision import transforms
import time
import cv2
from tqdm import tqdm
from resevit_road import restevit_road_cls_lightweight
from scipy.signal import wiener
import numpy as np

device = torch.device("cuda:0")

def trasform_img(img):
    resize = 224
    mean = (0.485, 0.456, 0.406)
    std = (0.229, 0.224, 0.225)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype("float32") / 255.0
    img = torch.from_numpy(img).permute(2, 0, 1)
    img=img.to(device)
    return transforms.Compose([
                transforms.RandomResizedCrop(resize, scale=(0.7,1.0)),
                transforms.Normalize(mean=mean, std=std)])(img)
def predict(model, img):
    with torch.no_grad():
        output = model(img.unsqueeze(0))
        pred = torch.argmax(output, dim=1)
    return pred

def capture(capcap):
    while True:
        ret, frame = cap.read()
        if ret: 
            img = trasform_img(frame)
            return img
if __name__ == '__main__':
    print("begin")
    model = restevit_road_cls_lightweight(num_class=4)
    model.to(device)
    model.eval()
    cap=cv2.VideoCapture(0)
    #swap_up
    for _ in tqdm(range(10)):
        img = capture(cap)
        pred = predict(model, img) 
    for _ in tqdm(range(2000)):
        img = capture(cap)
        pred=predict(model,img)
    print("end")
