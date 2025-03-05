import numpy as np
import pickle
import redis
import json
from sklearn.linear_model import LinearRegression
from quixstreams import Application


# Connect to Redis
r = redis.StrictRedis(host='redis', port=6379, db=0, decode_responses=True)

# Load parameter values from Redis
def load_parameter_values_from_redis():
    parameter_data_json = r.get('parameter_data')
    if parameter_data_json:
        parameter_data = json.loads(parameter_data_json)
        print("Loaded parameter data from Redis:", parameter_data)
    else:
        print("No parameter data found in Redis.")
    return parameter_data

# Load the model from the file
with open('tire_explosion_model.pkl', 'rb') as file:
    loaded_model = pickle.load(file)

# Configure an Application for Quix Streams
app = Application(consumer_group="model-runner")

# Create a consumer and start a polling loop
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
        road_speed = float(kafka_data.get('road_speed', 0))
        print("road_speed from Kafka:", road_speed)

        print("refreshing data from Redis")
        parameter_data = load_parameter_values_from_redis()
        print(parameter_data)
        tyre_pressure = float(parameter_data.get('tyre_pressure', 0))
        tyre_diameter = float(parameter_data.get('tyre_diameter', 0))
        print("tyre_pressure from Redis:", tyre_pressure)
        print("tyre_diameter from Redis:", tyre_diameter)
        # Example prediction using data from Redis and Kafka
        if parameter_data:
            new_data = np.array([[tyre_pressure,
                                  tyre_diameter,
                                  road_speed]])
            predicted_risk = loaded_model.predict(new_data)
            print(f'Predicted Risk of Explosion: {predicted_risk[0]}')
        else:
            print("Insufficient data for prediction.")

        # Store the offset of the processed message
        consumer.store_offsets(message=msg)