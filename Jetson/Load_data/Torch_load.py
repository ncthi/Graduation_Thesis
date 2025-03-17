import torch
from torch.utils.data import DataLoader, Subset
from sklearn.model_selection import KFold
from torchvision import transforms
import torch.utils.data as data
import os
import glob
from PIL import Image

# def top_crop(img):
#     return img.crop((0, 200, img.width, int(img.height))) 
# class ImageTransform():
#     def __init__(self, resize, mean =(0.485, 0.456, 0.406), std =  (0.229, 0.224, 0.225)):
#         self.data_transform = {
#             'Train': transforms.Compose([
#                 transforms.Lambda(top_crop),
#                 transforms.RandomResizedCrop(resize, scale=(0.7,1.0)),
#                 transforms.RandomHorizontalFlip(),
#                 transforms.RandomRotation(degrees=(-20, 20)),
#                 transforms.ColorJitter(brightness=0.1, contrast=0.1),
#                 transforms.ToTensor(),
#                 transforms.Normalize(mean=mean, std=std)
#             ]),
#             'Val':  transforms.Compose([
#                 transforms.Lambda(top_crop),
#                 transforms.RandomResizedCrop(resize, scale=(0.7,1.0)),
#                 transforms.ToTensor(),
#                 transforms.Normalize(mean=mean, std=std)
#             ]),
#              'Test':  transforms.Compose([
#                 transforms.Lambda(top_crop),
#                 transforms.RandomResizedCrop(resize, scale=(0.7,1.0)),
#                 transforms.ToTensor(),
#                 transforms.Normalize(mean=mean, std=std)])
#         }
    
#     def __call__(self, img, phase='Train'):
#         return self.data_transform[phase](img)

class ImageTransform():
    def __init__(self, resize, mean =(0.485, 0.456, 0.406), std =  (0.229, 0.224, 0.225)):
        self.data_transform = {
            'Train': transforms.Compose([
                transforms.RandomResizedCrop(resize, scale=(0.7,1.0)),
                transforms.RandomHorizontalFlip(),
                transforms.RandomRotation(degrees=(-20, 20)),
                transforms.ColorJitter(brightness=0.1, contrast=0.1),
                transforms.ToTensor(),
                transforms.Normalize(mean=mean, std=std)
            ]),
            'Val':  transforms.Compose([
                transforms.RandomResizedCrop(resize, scale=(0.7,1.0)),
                transforms.ToTensor(),
                transforms.Normalize(mean=mean, std=std)
            ]),
             'Test':  transforms.Compose([
                transforms.RandomResizedCrop(resize, scale=(0.7,1.0)),
                transforms.ToTensor(),
                transforms.Normalize(mean=mean, std=std)])
        }
    
    def __call__(self, img, phase='Train'):
        return self.data_transform[phase](img)

class MyDataset(data.Dataset):
    def __init__(self, file_list, transform=None, phase="Train",task="binary"):
        self.file_list = file_list
        self.transform = transform
        self.phase = phase
        self.task=task
        
    def __len__(self):
        return len(self.file_list)

    def __getitem__(self, idx):
        try: 
            img_path = self.file_list[idx]
            img = Image.open(img_path)
            img_transformed = self.transform(img, self.phase)
            parent_dir = parent_dir = img_path.split('/')[-2]
            if self.task=="binary":
                if parent_dir=="BadRoad":
                    label=0
                elif parent_dir=="GoodRoad":
                    label=1
            else:
                if parent_dir=="good":
                    label=0
                elif parent_dir=="poor":
                    label=1
                elif parent_dir=="satisfactory":
                    label=2
                elif parent_dir=="very_poor":
                    label=3
            return img_transformed, label
        except  Exception as e:  
            print(img.size)
            print(e,img_path)


class Load_data:
    def __init__(self,mode="Train",image_size=224,batch_size=32,n_splits=5,task="binary"):
        self.mode=mode
        self.image_size=image_size
        self.batch_size=batch_size
        self.kfold = KFold(n_splits=n_splits, shuffle=True)
        self.task=task
        if task=="binary":
            self.data_path = "/home/jupyter-iec_thicao/Dataset/Road_binary"
        else:
            self.data_path = "/home/jupyter-iec_thicao/Dataset/Road_multiclass"
        
    def make_datapath_list(self,phase="Train"):
        target_path = os.path.join(self.data_path, phase, "*/*.jpg")
        path_list = []
        for path in glob.glob(target_path):
            path_list.append(path)
        return path_list

    def __call__(self):
        if self.mode!="Train":
            test_list = self.make_datapath_list("Test")
            test_dataset = MyDataset(test_list, transform=ImageTransform(self.image_size), phase="Test",task=self.task)
            test_dataloader = torch.utils.data.DataLoader(test_dataset, self.batch_size, shuffle=True)
            return test_dataloader
        else:
            data_list = self.make_datapath_list("Train")
            for train_ids,val_ids in self.kfold.split(data_list ):
                train_list=Subset(data_list, train_ids)
                val_list=Subset(data_list,val_ids)
                train_dataset = MyDataset(train_list, transform=ImageTransform(self.image_size), phase="Train",task=self.task)
                val_dataset = MyDataset(val_list, transform=ImageTransform(self.image_size), phase="Val",task=self.task)
                train_dataloader = torch.utils.data.DataLoader(train_dataset, self.batch_size, shuffle=True)
                val_dataloader = torch.utils.data.DataLoader(val_dataset, self.batch_size, shuffle=False)
                dataloader_dict = {"Train":train_dataloader, "Val":val_dataloader}
                yield dataloader_dict
                