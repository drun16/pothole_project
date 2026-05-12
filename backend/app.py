from flask import Flask, request, jsonify, send_from_directory # 🆕 NEW: Added send_from_directory
from flask_cors import CORS
from ultralytics import YOLO
import os
from werkzeug.utils import secure_filename
from pymongo import MongoClient # 🆕 NEW: Import MongoDB client
import datetime                 # 🆕 NEW: To timestamp our reports
from bson.objectid import ObjectId
import uuid  # 🆕 NEW: Import the unique ID generator

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

print("Loading YOLOv8 model... Please wait.")
model = YOLO('C://Users//Admin//Documents//projects//pothole//best.pt') 
print("✅ Model loaded successfully!")

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
        detections = []
        
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

                detections.append({
                    'box': b,
                    'confidence': conf,
                    'severity': severity,
                    'area_pixels': round(area, 2)
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

        # 🆕 NEW: Smart Database Saving Logic!
        # Always save manual uploads. But for LIVE camera, ONLY save if a pothole is found!
        if source == 'upload' or (source == 'live' and len(detections) > 0):
        # 🆕 NEW: Save this report to MongoDB, now including the real GPS data!
            report_data = {
                'image_filename': original_filename,
                'pothole_count': len(detections),
                'detections': detections,
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
            os.remove(filepath)
            db_saved = False
        # ... (return statement stays the same) ...
        # # Insert into database and get the generated ID
        # inserted_report = reports_collection.insert_one(report_data)

        return jsonify({
            'message': 'Detection complete',
            'saved_to_db': db_saved, # Let the frontend know if we saved it
            'pothole_count': len(detections),
            'detections': detections
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
    reports = []
    # Fetch all reports, sort by newest first
    for report in reports_collection.find().sort('reported_at', -1):
        report['_id'] = str(report['_id']) # Convert ObjectId to string for JSON
        reports.append(report)
    
    return jsonify(reports), 200

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