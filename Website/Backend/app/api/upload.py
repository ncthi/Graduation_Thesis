from fastapi import APIRouter, File, UploadFile
from fastapi.responses import JSONResponse, FileResponse
import os
import re

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload-image/")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        return JSONResponse(status_code=400, content={"error": "File is not an image."})
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as f:
        f.write(await file.read())
    return {"filename": file.filename, "message": "Upload successful"}

@router.get("/list-images/")
async def list_images():
    try:
        files = os.listdir(UPLOAD_DIR)
        image_files = [f for f in files if f.lower().endswith((".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"))]
        result = []
        from PIL import Image
        import piexif
        for filename in image_files:
            file_path = os.path.join(UPLOAD_DIR, filename)
            metadata = {}
            comments = None
            try:
                with Image.open(file_path) as img:
                    exif_data = img.info.get('exif')
                    if exif_data:
                        exif_dict = piexif.load(exif_data)
                        def decode_exif(exif):
                            result = {}
                            for ifd in exif:
                                if isinstance(exif[ifd], dict):
                                    for tag, value in exif[ifd].items():
                                        tag_name = piexif.TAGS[ifd][tag]["name"] if tag in piexif.TAGS[ifd] else str(tag)
                                        if isinstance(value, bytes):
                                            try:
                                                value = value.decode('utf-8', errors='ignore')
                                            except Exception:
                                                value = str(value)
                                        result[f"{ifd}:{tag_name}"] = value
                            return result
                        full_metadata = decode_exif(exif_dict)
                        # Xử lý giá trị Predict và location cho đúng, loại bỏ tiền tố 'ASCII\x00\x00\x00' nếu có
                        def clean_text(val):
                            if isinstance(val, str):
                                return val.replace('ASCII\x00\x00\x00', '').replace('ASCII\x00', '').strip()
                            return val
                        predict_raw = clean_text(full_metadata.get('0th:ImageDescription')) or clean_text(full_metadata.get('Exif:UserComment'))
                        location = None
                        if predict_raw and isinstance(predict_raw, str):
                          
                            import re
                            # Tách Prediction và Location từ chuỗi predict_raw
                            match = re.search(r'Prediction:\s*(\d+)', predict_raw)
                            if match:
                                prediction = int(match.group(1))
                            match_loc = re.search(r'Location:\s*([\(\)\d\.,\s]+)', predict_raw)
                            if match_loc:
                                location = match_loc.group(1).strip()
                        else: print(full_metadata)
                        map_label={
                            0: "Asphalt bad",
                            1: "Good road",
                            2: "Paved bad",
                            3: "Paved good",
                            4: "Rain",
                            5: "Unpaved bad",
                            6: "Unpaved good",
                        }
                        metadata = {
                            "Prediction": map_label[prediction],
                            "Location": location
                        }
                    else:
                        metadata = {"Predict": None, "location": None}
            except Exception as e:
                metadata = {"Predict": None, "location": None, "error": str(e)}
            result.append({
                "filename": filename,
                "url": f"/get-image/{filename}",
                "metadata": metadata,
            })
        return {"images": result}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# Raw image serving endpoint (giữ endpoint cũ để trả file ảnh trực tiếp)
@router.get("/get-image/{filename}")
async def get_image_raw(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        return JSONResponse(status_code=404, content={"error": "File not found."})
    return FileResponse(file_path)