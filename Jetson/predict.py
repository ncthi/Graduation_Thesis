import torch
from torchvision import transforms
import time
import cv2
from tqdm import tqdm
from ResEViT_Road import ResEViT_road_cls
from scipy.signal import wiener
import piexif
from PIL import Image
from io import BytesIO
import requests
import serial
import re
from multiprocessing import Process, Queue
from collections import OrderedDict

# Device setup
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Get GPS location from SIM module

def turn_on_gps(serial_port='/dev/ttyUSB2', baudrate=115200):
    try:
        ser = serial.Serial(serial_port, baudrate, timeout=2)
        time.sleep(1)
        ser.write(b'AT+CGPS=1,1\r')
        time.sleep(2)
        ser.write(b'AT+CGPS=1\r')
    except Exception as e:
        print("GPS Error:", e)

def get_gps_location(serial_port='/dev/ttyUSB2', baudrate=115200):
    try:
        ser = serial.Serial(serial_port, baudrate, timeout=2)
        for _ in range(10):
            ser.write(b'AT+CGPSINFO\r')
            time.sleep(0.2)
            response = ser.read(ser.inWaiting()).decode(errors='ignore')

            if '+CGPSINFO:' in response:
                match = re.search(r'\+CGPSINFO: ([^,]*),([^,]*),([^,]*),([^,]*),', response)
                if match:
                    lat_raw = match.group(1)
                    lon_raw = match.group(3)

                    if lat_raw and lon_raw:
                        lat = convert_to_decimal(lat_raw)
                        lon = convert_to_decimal(lon_raw)
                        return lat, lon
            time.sleep(1)
    except Exception as e:
        print("GPS Error:", e)

    return None, None

def convert_to_decimal(coord_str):
    try:
        degrees = int(coord_str[:2])
        minutes = float(coord_str[2:])
        return degrees + (minutes / 60)
    except:
        return None

def transform_img(img):
    resize = 224
    mean = (0.485, 0.456, 0.406)
    std = (0.229, 0.224, 0.225)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype("float32")
    img = torch.from_numpy(img).permute(2, 0, 1)
    img = transforms.Compose([
        transforms.Resize((resize, resize)),
        transforms.Normalize(mean=mean, std=std)
    ])(img)
    return img.to(device)

def predict(model, img):
    with torch.no_grad():
        output = model(img.unsqueeze(0))
        pred = torch.argmax(output, dim=1)
    return pred.item()

def add_metadata(np_img, label_text,location):
    label = f"Prediction: {label_text}, Location: {location}"
    img_pil = Image.fromarray(np_img)

    exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": None}
    exif_dict["Exif"][piexif.ExifIFD.UserComment] = b"ASCII\x00\x00\x00" + label.encode("utf-8")
    exif_bytes = piexif.dump(exif_dict)

    output_buffer = BytesIO()
    img_pil.save(output_buffer, format="JPEG", exif=exif_bytes)
    output_buffer.seek(0)
    name_file=f"{time.time()}.jpg"
    files = {'file': (name_file, output_buffer, 'image/jpeg')}
    return files

def capture(cap):
    while True:
        ret, frame = cap.read()
        if ret:
            return frame

def send_image(q):
    while True:
        if not q.empty():
            file=q.get()
            try:
                response = requests.post("https://c68c-42-112-71-211.ngrok-free.app/upload-image/", files=file)
                response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)
                # print("Upload status:", response.status_code)
            except requests.exceptions.RequestException as e:
                print("Error sending image:", e)


if __name__ == '__main__':
    print("Begin")
    model = ResEViT_road_cls(num_classes=2)
    model.to(device)
    check_point=torch.load("resevit_road_standard_CRDDC-04-21--10-29-state_dict.pt")

    cleaned_state_dict = OrderedDict()
    for k, v in check_point.items():
        if k.startswith('model.'):
            new_key = k[len('model.'):]
            cleaned_state_dict[new_key] = v
        else:
            cleaned_state_dict[k] = v
    model.load_state_dict(cleaned_state_dict)
    model.eval()


    cap = cv2.VideoCapture(0)
    turn_on_gps()

    #Warm up
    for _ in tqdm(range(5)):
        frame = capture(cap)
        img_tensor = transform_img(frame)
        _ = predict(model, img_tensor)

    # Inference loop
    q=Queue()
    p1 = Process(target=send_image, args=(q,))
    p1.start()
    for _ in tqdm(range(500)):
        location = get_gps_location()
        frame = capture(cap)
        img_tensor = transform_img(frame)
        pred = predict(model, img_tensor)
        if pred==0:
            file=add_metadata(frame,pred,location)
            q.put(file)
    p1.join()

    print("End")
