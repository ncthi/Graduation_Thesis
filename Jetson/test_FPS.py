import torch
from PIL import Image
#import torchvision.transforms as transforms
import time
from resevit_road import restevit_road_cls
import gc
device=torch.device("cuda:0")
batch_size=16
def init_tensor():
    torch.cuda.empty_cache()
    tensor = torch.randn((batch_size, 3, 224, 224))
    return tensor
def measure_fps(model,tensor,num_frames=100):
    with torch.no_grad():
        model=model.to(device)
        model.eval()
        tensor_gpu=tensor.to(device)
        del tensor
        model(tensor_gpu[:3])
        start_time=time.time()
        process_time=start_time
        for i in range(num_frames):
            output = model(tensor_gpu)
            #print(f"{time.time()-process_time:.2f}",i)
        end_time=time.time()
    fps=num_frames/(end_time-start_time)*batch_size
    return fps

if __name__ == '__main__':
    print("begin")
    model=restevit_road_cls(num_class=4)
    tensor=init_tensor()
    torch.cuda.empty_cache()
    time.sleep(20)
    fps=measure_fps(model,tensor)
    print(f'fps: {fps:.2f}')
    print("end")