from .modules import  input_stem, MBConv_stage, EfficientViT_stage,resnet_block,resnet_in
from torch import nn
from .layers.nn import ConcatLayer,InterleavedLayer, CascadedGroupAttention, LocalWindowAttention
from .modules.efficientvitb1_block.nn import LiteMLA
import torch.nn.functional as F
import torch

class Combine_block(nn.Module):
    def __init__(self,x_channel,y_channel):
        super().__init__()
        self.concat_layer=ConcatLayer()
        out_channel=x_channel+y_channel
        self.dw_conv=nn.Conv2d(in_channels=out_channel, out_channels=out_channel, kernel_size=1,groups=out_channel)
        self.point_conv=nn.Conv2d(in_channels=out_channel, out_channels=out_channel, kernel_size=1)
        self.nor=nn.LayerNorm([out_channel,7,7])
    def forward(self,x,y):
        result=self.concat_layer(x,y)
        result=self.dw_conv(result)
        result=self.point_conv(result)
        result=self.nor(result)
        return result
        
class Interaction_block(nn.Module):
    def __init__(self,x_channel,y_channel,out_channel,index):
        super().__init__()
        self.interleavedLayer=InterleavedLayer(x_channel,y_channel)
        self.attn= CascadedGroupAttention(256, 8, num_heads=8,attn_ratio=4,resolution=14,kernels=[5]*8)
        self.downchannel=nn.Conv2d(x_channel+y_channel,out_channel,kernel_size=1)
        self.relu=nn.ReLU()
        self.bn = nn.BatchNorm2d(out_channel)
        self.index=index
    def forward(self,x,y):
        result= self.interleavedLayer(x,y)
        result=self.attn(result)
        result=self.downchannel(result)
        if self.index==0: result=x+result
        else:  result=y+result
        result=self.relu(result)
        result= self.bn(result)
        return result


class restevit_road_backbone(nn.Module):
    def __init__(self,
        res_channels=[32,64,128,256],
        res_depths=[1,1,1,1],
        efficientvit_channels=[16, 32, 64, 128, 256],
        efficientvit_depths=[1, 2, 2, 2, 2]):
        super().__init__()
        self.resnet_in=resnet_in()
        self.efficientvit_in=input_stem(3,efficientvit_channels[0],efficientvit_depths[0])
        self.block1=resnet_block(32,res_channels[0],1,res_depths[0])  
        self.block2=resnet_block(res_channels[0],res_channels[1],2,res_depths[1])      
        self.block3=resnet_block(res_channels[1],res_channels[2],2,res_depths[2])      
        self.block4=resnet_block(res_channels[2],res_channels[3],2,res_depths[3])  
        self.stage1=MBConv_stage(efficientvit_channels[0],efficientvit_channels[1],efficientvit_depths[1])
        self.stage2=MBConv_stage(efficientvit_channels[1],efficientvit_channels[2],efficientvit_depths[2])
        self.stage3=EfficientViT_stage(efficientvit_channels[2],efficientvit_channels[3],efficientvit_depths[3])
        self.stage4=EfficientViT_stage(efficientvit_channels[3],efficientvit_channels[4],efficientvit_depths[4])
        self.interaction_to_r=Interaction_block(res_channels[2],efficientvit_channels[3],res_channels[2],0)
        self.interaction_to_v=Interaction_block(res_channels[2],efficientvit_channels[3],efficientvit_channels[3],1)
        self.concat_block=Combine_block(res_channels[3],efficientvit_channels[4])

    def forward(self,x):
        res=self.resnet_in(x)
        vit=self.efficientvit_in(x)
        res=self.block1(res)
        vit=self.stage1(vit)
        res=self.block2(res)
        vit=self.stage2(vit)
        res=self.block3(res)
        vit=self.stage3(vit)
        res=self.interaction_to_r(res,vit)
        vit=self.interaction_to_v(res,vit)
        res=self.block4(res)
        vit=self.stage4(vit)
        result= self.concat_block(res,vit)
        return result

class restevit_road_cls(nn.Module):
    def __init__(self,num_class=2):
        super().__init__()
        self.base_mdoel=restevit_road_backbone()
        self.apdative=nn.AdaptiveAvgPool2d(1)
        self.classification=nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.2),
            nn.ReLU(),
            nn.Linear(512,num_class)
        )
    def forward(self,x):
        x=self.base_mdoel(x)
        x=self.apdative(x)
        x=self.classification(x)
        return x




