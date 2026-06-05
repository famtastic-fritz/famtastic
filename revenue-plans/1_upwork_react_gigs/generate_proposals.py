#!/usr/bin/env python3
"""
Simple script to generate customized proposals from template.
"""
import sys
import os

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_proposals.py <job_title>")
        sys.exit(1)
    
    job_title = sys.argv[1]
    template_path = os.path.join(os.path.dirname(__file__), "proposal_template.md")
    
    with open(template_path, "r") as f:
        template = f.read()
    
    # Replace placeholders
    proposal = template.replace("[Customize per job]", job_title)
    # You could add more customization based on job_title
    
    output_path = os.path.join(os.path.dirname(__file__), "proposals", f"{job_title.replace(' ', '_')}_proposal.md")
    with open(output_path, "w") as f:
        f.write(proposal)
    
    print(f"Proposal generated: {output_path}")

if __name__ == "__main__":
    main()