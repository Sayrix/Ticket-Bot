from datetime import datetime


def timestamp_to_datetime(timestamp):
    # Remove the last 3 numbers of the timestamp
    dt = datetime.fromtimestamp(timestamp // 1000)
    
    return dt



if __name__ == '__main__':
    

    # timestamp is number of seconds since 1970-01-01 
    timestamp = 1545730073

    # convert the timestamp to a datetime object in the local timezone
    dt_object = datetime.fromtimestamp(1689268961975 // 1000)

    # print the datetime object and its type
    print("dt_object =", dt_object)