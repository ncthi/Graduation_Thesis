from torch import nn
import timm

class ResNet18(nn.Module):
    def __init__(self,num_classes=2):
        super().__init__()
        self.model=timm.create_model('resnet18',pretrained=False,num_classes=num_classes)
    def forward(self,x):
        x=self.model(x)
        return x
class ResNet34(nn.Module):
    def __init__(self,num_classes=2):
        super().__init__()
        self.model=timm.create_model('resnet34',pretrained=False,num_classes=num_classes)
    def forward(self,x):
        x=self.model(x)
        return x

class ResNet50(nn.Module):
    def __init__(self,num_classes=2):
        super().__init__()
        self.model=timm.create_model('resnet50',pretrained=False,num_classes=num_classes)
    def forward(self,x):
        x=self.model(x)
        return x