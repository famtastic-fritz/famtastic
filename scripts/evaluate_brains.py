import subprocess
import time
import os

# Models to test via the Shay CLI router
MODELS = ["opencode", "goose", "gemini-2.5-pro"]

# Standardized tasks
PROMPTS = {
    "Reasoning": "If you have a 3-gallon jug and a 5-gallon jug, how do you measure exactly 4 gallons? Be extremely concise.",
    "Coding": "Write a React functional component for a button that counts clicks. Return ONLY the code, no markdown wrapping.",
    "Instruction Following": "Output the exact words 'brain test complete' in valid JSON format with the key 'status'. Do not output anything else."
}

def run_benchmark():
    output_file = os.path.expanduser("~/famtastic/obsidian/Shay-Memory/post-review/BRAIN-BENCHMARK-RESULTS.md")
    print("🧠 Starting Brain Evaluation Benchmark...")
    
    with open(output_file, "w") as f:
        f.write("# Brain Evaluation Results\n")
        f.write(f"**Date:** {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("Measuring latency, reasoning accuracy, coding precision, and instruction adherence.\n\n")
        
        for model in MODELS:
            print(f"\nTesting model: {model}...")
            f.write(f"## Model: {model}\n")
            
            for task_name, prompt in PROMPTS.items():
                print(f"  -> Task: {task_name}")
                start_time = time.time()
                
                try:
                    # Run via Shay CLI to ensure our gateway routing is what we are actually testing
                    result = subprocess.run(
                        ["shay", "chat", "--model", model, prompt],
                        capture_output=True, text=True, timeout=45
                    )
                    latency = time.time() - start_time
                    output = result.stdout.strip() if result.returncode == 0 else result.stderr.strip()
                except subprocess.TimeoutExpired:
                    latency = 45.0
                    output = "ERROR: Timed out after 45 seconds."
                except Exception as e:
                    latency = time.time() - start_time
                    output = f"ERROR: {str(e)}"
                    
                f.write(f"### Task: {task_name} (Latency: {latency:.2f}s)\n")
                f.write(f"```text\n{output}\n```\n\n")

    print(f"\n✅ Benchmark complete. Results saved to: {output_file}")

if __name__ == "__main__":
    run_benchmark()
