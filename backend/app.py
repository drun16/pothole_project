from flask import Flask, request, jsonify, send_from_directory # 🆕 NEW: Added send_from_directory
from flask_cors import CORS
from ultralytics import YOLO
import torch
import cv2 
from depth_anything_v2.dpt import DepthAnythingV2
import os
from werkzeug.utils import secure_filename
from pymongo import MongoClient # 🆕 NEW: Import MongoDB client
import datetime                 # 🆕 NEW: To timestamp our reports
from bson.objectid import ObjectId
import uuid  # 🆕 NEW: Import the unique ID generator
# 🆕 NEW: Security imports
import jwt
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
import numpy as np
import base64 # 👈 🆕 NEW: Import base64 for temporary images

app = Flask(__name__)
CORS(app) 

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 🆕 NEW: MongoDB Connection Setup
# Replace this string with your MongoDB Atlas URI later!
MONGO_URI = "mongodb+srv://admin:Pothole123@cluster0.gphcjdm.mongodb.net/?appName=Cluster0" 
client = MongoClient(MONGO_URI)
db = client['pothole_database']
reports_collection = db['reports']

# 🆕 NEW: Security Configuration
app.config['SECRET_KEY'] = 'pothole_super_secret_key_2026' # Used to sign the JWT

admins_collection = db['admins']

# Automatically create a default admin if one doesn't exist
if not admins_collection.find_one({'email': 'admin@pothole.com'}):
    print("Creating default admin account...")
    admins_collection.insert_one({
        'email': 'admin@pothole.com',
        'password': generate_password_hash('Admin123!') # Hashes the password securely!
    })

print("Loading YOLOv8 model... Please wait.")
model = YOLO('C://Users//Admin//Documents//projects//pothole//best.pt') 
print("✅ Model loaded successfully!")
# 🆕 NEW: Load Depth Anything V2 Model
print("Loading Depth Anything V2 model... Please wait.")
DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
depth_model = DepthAnythingV2(encoder='vits', features=64, out_channels=[48, 96, 192, 384])
depth_model.load_state_dict(torch.load('C://Users//Admin//Documents//projects//pothole_depth//checkpoints//depth_anything_v2_vits.pth', map_location='cpu'))
depth_model = depth_model.to(DEVICE).eval()
print("✅ Depth Model loaded successfully!")

# 🆕 NEW: The Security Lock (Decorator)
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check if the token is in the headers
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1] # Format: "Bearer <token>"
        
        if not token:
            return jsonify({'message': 'Token is missing! Access denied.'}), 401
            
        try:
            # Decode the token to see who it belongs to
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_admin = admins_collection.find_one({'email': data['email']})
        except:
            return jsonify({'message': 'Token is invalid or expired!'}), 401
            
        return f(current_admin, *args, **kwargs)
    return decorated

# 🆕 NEW: The Login Route
@app.route('/api/login', methods=['POST'])
def login():
    auth = request.json
    
    if not auth or not auth.get('email') or not auth.get('password'):
        return jsonify({'message': 'Could not verify credentials'}), 401

    admin = admins_collection.find_one({'email': auth.get('email')})
    
    # Check if user exists and password matches the hash
    if admin and check_password_hash(admin['password'], auth.get('password')):
        # Generate a token that lasts for 24 hours
        token = jwt.encode({
            'email': admin['email'], 
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        return jsonify({'token': token}), 200

    return jsonify({'message': 'Invalid email or password'}), 401

@app.route('/api/detect', methods=['POST'])
def detect_pothole():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file:
        # filename = secure_filename(file.filename)
        # filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        # file.save(filepath)
        # 🆕 NEW: Generate a completely unique filename for every single upload!
        original_filename = secure_filename(file.filename)
        
        # Grab the file extension (e.g., .jpg, .png)
        file_ext = os.path.splitext(original_filename)[1]
        if not file_ext:
            file_ext = '.jpg' # Default to jpg for webcam frames
            
        # Create a unique name like: 8f7d9a...b4.jpg
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        
        # Save it with the new unique name
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)

        # ... (previous file saving code stays the same) ...
        # 🆕 NEW: Determine if this is a manual upload or a live video feed
        source = request.form.get('source', 'upload')

        results = model(filepath)

        # 🆕 NEW: Generate a temporary annotated image with bounding boxes!
        output_base64 = None
        
        detections = []
        max_pothole_depth = 0.0
        has_potholes = len(results[0].boxes) > 0
        
        # 🆕 NEW: Only run the heavy depth model if YOLO actually found something!
        if has_potholes:
            raw_image = cv2.imread(filepath)
            # Generate the depth map for the whole image
            depth_map = depth_model.infer_image(raw_image)

        for r in results:
            boxes = r.boxes
            for box in boxes:
                b = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                conf = round(box.conf[0].item(), 2)
                
                # 🆕 NEW: Calculate the width and height of the bounding box
                width = b[2] - b[0]
                height = b[3] - b[1]
                
                # 🆕 NEW: Calculate the area (in pixels)
                area = width * height
                
                # 🆕 NEW: Determine severity based on the area
                # (You may need to adjust these numbers based on your specific camera distance)
                if area > 50000:
                    severity = 'Severe'
                elif area > 20000:
                    severity = 'Medium'
                else:
                    severity = 'Minor'
                
                # 🆕 NEW: Calculate depth for this specific bounding box
                box_depth = 0.0
                if has_potholes:
                    x1, y1, x2, y2 = map(int, b)
                    # Extract just the pothole area from the depth map
                    depth_crop = depth_map[y1:y2, x1:x2]
                    if depth_crop.size > 0:
                        box_depth = float(np.mean(depth_crop)) # Average depth of the pothole
                        if box_depth > max_pothole_depth:
                            max_pothole_depth = box_depth

                detections.append({
                    'box': b,
                    'confidence': conf,
                    'severity': severity,
                    'area_pixels': round(area, 2),
                    'estimated_depth': round(box_depth, 2)
                })
        # results = model(filepath)
        
        # detections = []
        # for r in results:
        #     boxes = r.boxes
        #     for box in boxes:
        #         b = box.xyxy[0].tolist()  
        #         conf = round(box.conf[0].item(), 2)
                
        #         # 🆕 NEW: Simple severity logic based on confidence or size (placeholder)
        #         severity = 'High' if conf > 0.8 else 'Medium'

        #         detections.append({
        #             'box': b,
        #             'confidence': conf,
        #             'severity': severity
        #         })

        # 🆕 NEW: Save this report to MongoDB!
        # report_data = {
        #     'image_filename': filename,
        #     'pothole_count': len(detections),
        #     'detections': detections,
        #     'status': 'Pending', # Default status for authorities
        #     'reported_at': datetime.datetime.utcnow()
        # }
        # ... (previous code above stays the same) ...

        
        # 🆕 NEW: Get latitude and longitude from the request if they exist
        lat = request.form.get('latitude')
        lng = request.form.get('longitude')
        email = request.form.get('email') # 🆕 NEW: Capture user's email

        # 2. Safely convert them to floats ONLY if they exist and are valid strings
        # (Sometimes React sends the word "undefined", we need to ignore that too)
        safe_lat = float(lat) if lat and lat != 'undefined' else None
        safe_lng = float(lng) if lng and lng != 'undefined' else None

        # 🆕 NEW: Generate a temporary annotated image with bounding boxes!
        output_base64 = None

        if source == 'upload': # We only do this for manual uploads to keep the live camera fast
            # .plot() is YOLO's magic function that draws the boxes and labels
            annotated_img = results[0].plot() 
            # Convert the image to a temporary memory buffer
            _, buffer = cv2.imencode('.jpg', annotated_img)
            # Encode it to a text string to send to React safely
            output_base64 = base64.b64encode(buffer).decode('utf-8')

        # 🆕 NEW: Smart Database Saving Logic!
        # Always save manual uploads. But for LIVE camera, ONLY save if a pothole is found!
        # Rule 1: Always save if it's a manual upload.
        # Rule 2: If it's a live camera feed, ONLY save if at least 1 pothole was found!
        if source == 'upload' or (source == 'live' and len(detections) > 0):
        # 🆕 NEW: Save this report to MongoDB, now including the real GPS data!
            report_data = {
                'image_filename': original_filename,
                'pothole_count': len(detections),
                'detections': detections,
                'max_depth': round(max_pothole_depth, 2) if has_potholes else 0.0,
                'status': 'Pending',
                'reported_at': datetime.datetime.utcnow(),
                # Convert to float for mapping math, or save as None if user denied location
                'latitude': safe_lng, 
                'longitude': safe_lat,
                'email': email # 🆕 NEW: Save email to database
            }
            print(float(lat))
            print(float(lng))
            inserted_report = reports_collection.insert_one(report_data)
            db_saved = True
        else:
            # If it's a live frame with no potholes, we delete the temporary image to save space!
            # 🗑️ THE CLEANUP LOGIC: It's a live frame with NO potholes.
            # Delete the useless image from the uploads folder to save hard drive space!
            if os.path.exists(filepath):
                os.remove(filepath)
            db_saved = False
        # ... (return statement stays the same) ...
        # # Insert into database and get the generated ID
        # inserted_report = reports_collection.insert_one(report_data)

        return jsonify({
            'message': 'Detection complete',
            'saved_to_db': db_saved, # Let the frontend know if we saved it
            'pothole_count': len(detections),
            'detections': detections,
            'output_image': output_base64 # 👈 🆕 NEW: Send the temporary im
        }), 200

        # return jsonify({
        #     'message': 'Detection complete and saved to database!',
        #     'report_id': str(inserted_report.inserted_id),
        #     'pothole_count': len(detections),
        #     'detections': detections
        # }), 200

# 🆕 NEW: An API endpoint to fetch all reports for the Admin Map/Dashboard
@app.route('/api/reports', methods=['GET'])
def get_reports():
    try:
        # 1. Get the requested page number from the URL (default to page 1)
        # Example URL: /api/reports?page=2&limit=10
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        
        # 2. Calculate how many documents to skip
        # If we are on page 1, skip 0. If on page 2, skip 10.
        skip = (page - 1) * limit

        # 3. Count the total number of reports in the database
        total_reports = reports_collection.count_documents({})

        # 🆕 NEW: Calculate global totals directly from the database
        total_pending = reports_collection.count_documents({'status': 'Pending'})
        total_fixed = reports_collection.count_documents({'status': 'Fixed'})
        
        # 4. Calculate total pages needed (ceiling division logic)
        total_pages = (total_reports + limit - 1) // limit

        reports = []
        # 5. Query MongoDB: Sort by newest, skip the old ones, limit to 10
        cursor = reports_collection.find().sort('reported_at', -1).skip(skip).limit(limit)
        # Fetch all reports, sort by newest first
        for report in cursor:
            report['_id'] = str(report['_id']) # Convert ObjectId to string for JSON
            reports.append(report)
        
        return jsonify({
                'reports': reports,
                'metadata': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_reports': total_reports,
                    'total_pending': total_pending, #  Added to metadata
                    'total_fixed': total_fixed,     #  Added to metadata
                    'limit': limit
                }
            }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 🆕 NEW: Update report status (Admin feature)
# @app.route('/api/reports/<report_id>/status', methods=['PUT'])
# def update_status(report_id):
#     data = request.json
#     new_status = data.get('status')
    
#     if not new_status:
#         return jsonify({'error': 'No status provided'}), 400
        
#     try:
#         # Find the report by its MongoDB ID and update its status
#         result = reports_collection.update_one(
#             {'_id': ObjectId(report_id)},
#             {'$set': {'status': new_status}}
#         )
        
#         if result.modified_count == 1:
#             return jsonify({'message': 'Status updated successfully!'}), 200
#         else:
#             return jsonify({'message': 'Status was already set to this value.'}), 200
            
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500
    
# 🆕 NEW: Updated report status route with simulated notifications
@app.route('/api/reports/<report_id>/status', methods=['PUT'])
@token_required
def update_status(report_id):
    data = request.json
    new_status = data.get('status')
    
    if not new_status:
        return jsonify({'error': 'No status provided'}), 400
        
    try:
        # First, fetch the report so we know who to notify
        report = reports_collection.find_one({'_id': ObjectId(report_id)})
        
        result = reports_collection.update_one(
            {'_id': ObjectId(report_id)},
            {'$set': {'status': new_status}}
        )
        
        if result.modified_count == 1:
            # 🔔 NOTIFICATION LOGIC: If fixed and we have an email, "send" an alert!
            if new_status == 'Fixed' and report and report.get('email'):
                print("\n" + "="*50)
                print(f"📧 EMAIL DISPATCHED TO: {report['email']}")
                print(f"Subject: 🚧 Great News! Pothole Fixed!")
                print(f"Body: The pothole you reported at {report.get('latitude', 'your location')} has been officially repaired by the authorities. Thank you for making our roads safer!")
                print("="*50 + "\n")

            return jsonify({'message': 'Status updated successfully!'}), 200
        else:
            return jsonify({'message': 'Status was already set to this value.'}), 200
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 🆕 NEW: Route to securely serve the saved images to the React frontend
@app.route('/uploads/<filename>')
def serve_image(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.run(host="0.0.0.0",debug=True, port=5000)
    CORS(app)