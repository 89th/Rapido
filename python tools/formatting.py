import pandas as pd
import os

input_file = 'ssd.csv'
df = pd.read_csv(input_file)


def format_value(value):
    if isinstance(value, str):
        if "Unknown/Unknown MB/s" in value:
            return "Unknown MB/s"
        elif "Unknown/Unknown IOPS" in value:
            return "Unknown IOPS"
    return value


df = df.apply(lambda col: col.apply(format_value))

output_file = '../data/ssd.csv'
df.to_csv(output_file, index=False)

os.remove(input_file)
