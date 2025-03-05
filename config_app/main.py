from flask import Flask, request, redirect, jsonify, render_template, url_for
from flask_cors import CORS
import redis
import json
import threading
from quixstreams import Application
import signal
import sys
import os

local = False

from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0)

# Kafka consumer setup
def consume_kafka_data():
    app = None
    if local: 
        # print(os.environ["Quix__Sdk__Token"])
        app = Application(consumer_group="config-app",
                          broker_address="devkafka-k1.quix.io:9093,devkafka-k2.quix.io:9093,devkafka-k3.quix.io:9093",
                        quix_sdk_token="sdk-3b0dff74afcc4633bec5809690901a29")
    else:
        app = Application(consumer_group="config-app")
    
    with app.get_consumer() as consumer:
        consumer.subscribe(topics=['demo-templatemodelrunner-dev-tyre-data'])

        while True:
            msg = consumer.poll(0.1)
            if msg is None:
                continue
            elif msg.error():
                print('Kafka error:', msg.error())
                continue

            # Assuming the message value is a JSON string containing 'road_speed'
            kafka_data = json.loads(msg.value())

            print(kafka_data)

            # determine what parameters are available in the stream and store those in redis.
            # possibly add param values too

            # Store the offset of the processed message
            consumer.store_offsets(message=msg)

consume_kafka_data()


@app.route('/')
def index():
    return redirect(url_for('cache_inspector_page'))

@app.route('/publish_param_defs', methods=['POST'])
def publish_value():
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Store the JSON data in Redis
    r.set('parameters', json.dumps(data))
    r.sadd('app_data', 'parameters')
    return jsonify({'message': 'Data published successfully'}), 200

@app.route('/publish_parameter_data', methods=['POST'])
def publish_parameter_data():
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Save the submitted form data to Redis
    r.set('parameter_data', json.dumps(data))
    r.sadd('app_data', 'parameter_data')

    return jsonify({'message': 'Form data saved successfully'}), 200

@app.route('/delete_parameter_value', methods=['POST'])
def delete_parameter_value():
    data = request.json
    key_to_delete = data.get('key')

    # Load the existing parameter data from Redis
    parameter_data_json = r.get('parameter_data')
    if parameter_data_json:
        parameter_data = json.loads(parameter_data_json)

        # Remove the specified key from the parameter data
        if key_to_delete in parameter_data:
            del parameter_data[key_to_delete]

            # Save the updated parameter data back to Redis
            r.set('parameter_data', json.dumps(parameter_data))

            return jsonify({'message': f'Parameter {key_to_delete} deleted successfully'})
        else:
            return jsonify({'error': f'Parameter {key_to_delete} not found'}), 404
    else:
        return jsonify({'error': 'No parameter data found'}), 404

# READ CACHE 

@app.route('/read')
def read_all_values():
    # Get all keys from Redis
    keys = r.smembers("app_data")
    
    all_data = {}

    # Fetch each value and decode it
    for key in keys:
        # print(key)
        value = r.get(key)
        # print(value)
        if value is not None:
            all_data[key.decode('utf-8')] = json.loads(value.decode('utf-8'))

    if not all_data:
        return jsonify({'error': 'No data found'}), 404

    print(all_data)
    return jsonify(all_data), 200

# PARAMETERS

@app.route('/read_parameter_data')
def read_parameter_data():
    value = r.get('parameter_data')
    if value:
        return jsonify(json.loads(value.decode('utf-8')))
    return jsonify({})

@app.route('/get_parameters')
def get_parameters():
    value = r.get('parameters')
    if value is None:
        return jsonify([])  # Return an empty list if no data is found

    return jsonify(json.loads(value))

# UNITS

@app.route('/get_units', methods=['GET'])
def get_units():
    units = r.get('units_list')
    if units:
        return jsonify(json.loads(units))
    return jsonify([])

@app.route('/publish_units', methods=['POST'])
def publish_units():
    units = request.json
    r.set('units_list', json.dumps(units))
    r.sadd('app_data', 'units_list')
    return jsonify({'message': 'Units updated successfully'})


# PAGE ROUTES

@app.route('/cache_inspector_page')
def cache_inspector_page():
    return render_template('cache_inspector.html')

@app.route('/parameter_definitions_page')
def parameter_definitions_page():
    return render_template('parameter_definitions.html')

@app.route('/param_values_page')
def param_values_page():
    return render_template('param_values.html')

@app.route('/units_page')
def units_page():
    return render_template('units_definitions.html')


# Start Flask app in a separate thread
def run_flask_app():
    app.run(debug=False, port=80)


# Signal handler to stop threads
def signal_handler(sig, frame):
    global running
    print('Exiting...')
    running = False
    sys.exit(0)

# Register the signal handler
signal.signal(signal.SIGINT, signal_handler)


flask_thread = threading.Thread(target=run_flask_app)
flask_thread.start()

