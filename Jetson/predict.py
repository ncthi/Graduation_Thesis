import torch
from torchvision import transforms
import time
import cv2
from tqdm import tqdm
from ResEViT_Road import ResEViT_road_cls
import piexif
from PIL import Image
from io import BytesIO
import requests
import serial
import re
from multiprocessing import Process, Queue
from collections import OrderedDict
import os
import shutil

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



def convert_to_decimal(coord_str, hemisphere_str, is_latitude=True):
    try:
        if is_latitude:
            degrees = int(coord_str[:2])
            minutes = float(coord_str[2:])
        else:
            degrees = int(coord_str[:3])
            minutes = float(coord_str[3:])

        decimal_coord = degrees + (minutes / 60)

        if is_latitude and (hemisphere_str == 'S' or hemisphere_str == 's'):
            decimal_coord *= -1
        elif not is_latitude and (hemisphere_str == 'W' or hemisphere_str == 'w'):
            decimal_coord *= -1

        return decimal_coord
    except (ValueError, IndexError): # Catch specific exceptions
        return None

def get_gps_location(serial_port='/dev/ttyUSB2', baudrate=115200):
    try:
        ser = serial.Serial(serial_port, baudrate, timeout=2)
        for _ in range(10):
            ser.write(b'AT+CGPSINFO\r')
            time.sleep(0.5) # Increased sleep slightly for response
            response = ser.read(ser.inWaiting()).decode(errors='ignore') # Or ser.readline()

            if '+CGPSINFO:' in response:
                # Updated regex to capture hemisphere
                match = re.search(r'\+CGPSINFO: ([^,]*),([NSns]),([^,]*),([EWew]),', response)
                if match:
                    lat_raw = match.group(1)
                    lat_hemisphere = match.group(2)
                    lon_raw = match.group(3)
                    lon_hemisphere = match.group(4)

                    if lat_raw and lon_raw and lat_hemisphere and lon_hemisphere:
                        lat = convert_to_decimal(lat_raw, lat_hemisphere, is_latitude=True)
                        lon = convert_to_decimal(lon_raw, lon_hemisphere, is_latitude=False)
                        if lat is not None and lon is not None:
                            return lat, lon
            time.sleep(1)
    except Exception as e:
        print("GPS Error:", e)
        return None, None



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

def send_image():
    image_extensions = {'.jpg', '.jpeg', '.png'}
    api_url="https://projects.iec-uit.com/ResEViTRoad/api/upload-image/"
    while True:
        file_list = [
            filename for filename in os.listdir("cache")
            if os.path.isfile(os.path.join("cache", filename))
        ]
        sorted_files = sorted(
            file_list,
            key=lambda x: float(os.path.splitext(x)[0])
        )
        for filename in sorted_files:
            file_path = os.path.join("cache", filename)
            if os.path.isfile(file_path) and os.path.splitext(filename)[1].lower() in image_extensions:
                with open(file_path, 'rb') as f:
                    files = {'file': (filename, f, 'image/jpeg')}
                    try:
                        response = requests.post(api_url, files=files)
                        if response.status_code == 200:
                           os.remove(file_path)
                        else:
                            print(f"Failed to upload {filename}: {response.status_code}")
                    except Exception as e:
                        print(f"⚠Error uploading {filename}: {e}")
def save_to_cache(files):
    filename, file_buffer, _ = files['file']
    file_buffer.seek(0)

    filepath = os.path.join("cache",filename)
    with open(filepath, 'wb') as f:
        f.write(file_buffer.read())



if __name__ == '__main__':
    print("Begin")
    model = ResEViT_road_cls(num_classes=7)
    model.to(device)
    check_point=torch.load("resevit_road_standard_Road_CLS_Quality-06-23--15-40-state_dict.pt")

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
    p1 = Process(target=send_image)
    p1.start()
    print("Running")
    while True:
        location = get_gps_location()
        frame = capture(cap)
        img_tensor = transform_img(frame)
        pred = predict(model, img_tensor)
        if pred in [0,2,4,5]:
            files=add_metadata(frame,pred,location)
            save_to_cache(files)
        time.sleep(0.2)
