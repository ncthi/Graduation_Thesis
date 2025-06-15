import torch
import time

from timm.models import InceptionV4

from baseline import ResNet18,ResNet34,ResNet50, EfficientNetB1, EfficientNetB3,efficientvit_cls_b1,efficientvit_cls_b2,efficientvit_cls_b3,MobileVit_s,MobileViT_xs,MobileViT_xxs, Inception_v4
import argparse
from tqdm import tqdm
from ResEViT_Road import ResEViT_road_cls

def init_tensor():
    torch.cuda.empty_cache()
    tensor = torch.randn((1, 3, 224, 224))
    return tensor
def measure_fps(model,tensor,num_frames=100,device="cuda"):
    batch_size=tensor.shape[0]
    with torch.no_grad():
        model=model.to(device)
        model.eval()
        tensor=tensor.to(device)
        for _ in range(5): model(tensor)
        start_time=time.time()
        for _ in tqdm(range(num_frames)):
            model(tensor)
        end_time=time.time()
    fps=num_frames/(end_time-start_time)*batch_size
    return fps

def get_model(model_name: str, size: str, **kwargs):
    model_map = {
        "resnet": {
            "18": ResNet18(**kwargs),
            "34": ResNet34(**kwargs),
            "50": ResNet50(**kwargs),
        },
        "efficientvit": {
            "b1": efficientvit_cls_b1(**kwargs),
            "b2": efficientvit_cls_b2(**kwargs),
            "b3": efficientvit_cls_b3(**kwargs),
        },
        "efficientnet": {
            "b1":EfficientNetB1(**kwargs),
            "b3": EfficientNetB3(**kwargs),
        },
        "mobilevit": {
            "s": MobileVit_s(**kwargs),
            "xs": MobileViT_xs(**kwargs),
            "xxs": MobileViT_xxs(**kwargs),
        },
        "inception": {
            "v4": Inception_v4(**kwargs),
        },
        "resevit_road":{
            "standard": ResEViT_road_cls(**kwargs),
        }
    }
    return model_map[model_name][size]

def main(arg):
    model_name=arg.model_name
    model_size=arg.model_size
    num_classes=arg.num_classes
    device=arg.device
    print(f"Model: {model_name} {model_size}")
    print("begin")
    tensor=init_tensor()
    model=get_model(model_name,model_size,num_classes=num_classes)
    fps=measure_fps(model,tensor,device=device)
    print(f"FPS: {fps}")
    print("end")



if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Measuring FPS')
    parser.add_argument('--image_size', type=int, default=224, help='Image size for training')
    parser.add_argument('--num_classes', type=int, default=2, help='The number of class of dataset')
    parser.add_argument('--model_name', type=str, default="resevit", help='Model name to use')
    parser.add_argument('--model_size', type=str, default="small", help='Model size to use')
    parser.add_argument('--device', type=str, default="cuda", help='Device to use')
    args = parser.parse_args()
    main(args)
