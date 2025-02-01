import subprocess

scripts = ['ssd.py', 'performance.py', 'formatting.py']

for script in scripts:
    try:
        print(f"Running {script}...")
        subprocess.run(['python', script], check=True)
        print(f"{script} executed successfully.\n")
    except subprocess.CalledProcessError as e:
        print(f"An error occurred while running {script}: {e}")
