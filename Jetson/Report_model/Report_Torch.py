import numpy as np
from sklearn.metrics import classification_report
from tqdm import tqdm


class Predictor():
    def __init__(self, class_index):
        self.clas_index = class_index

    def predict_max(self, output): # [0.9, 0.1]
        output = output.cpu()
        # print(output)
        max_id = np.argmax(output.detach().numpy(),axis=1)
        return max_id

class_index=["Bad","Good"]
predictor = Predictor(class_index)

def predict(img):
    # prepare network
    # device = torch.device("cuda:1" if torch.cuda.is_available() else "cpu")
   
    # prepare input img
    # transform = ImageTransform(224)
    # img = transform(img, phase="Val")
    img = img.unsqueeze_(0) # (chan, height, width) -> (1, chan, height, width)

    # predict 
    output = model(img)
    # print(output)
    response = predictor.predict_max(output)

    return response

class Class_Report:
    def __init__(self,data,model,device):
        self.data=data
        self.model=model
        self.device=device
    def __call__(self):
        self.model.eval()
        predicts=[]
        label_co=[]
        for inputs, labels in tqdm(self.data):
            # print("inputs:",inputs)
            inputs=inputs.to(self.device)
            output = self.model(inputs)
            label_co=np.concatenate((label_co,labels))
            response = predictor.predict_max(output)
            predicts=np.concatenate((predicts,response))
        print(classification_report(label_co,  predicts,digits=4))