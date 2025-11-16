#!/usr/bin/env python3
"""
Git Ingest Automation Script

Uses the gitingest Python package to generate codebase digests.
Returns the complete formatted output for storage in the database.
"""

import argparse
import json
import sys
from typing import Optional

try:
    from gitingest import ingest
except ImportError:
    print(
        json.dumps({
            "success": False,
            "error": "gitingest package not installed. Install with: pip install gitingest"
        }),
        file=sys.stderr
    )
    sys.exit(1)


def process_git_ingest(repo_url: str) -> str:
    """
    Process a repository through GitIngest and return the complete digest content.
    
    Args:
        repo_url: The GitHub repository URL (e.g., https://github.com/owner/repo)
    
    Returns:
        The complete git ingest digest content as a string (summary + tree + content)
    
    Raises:
        Exception: If processing fails
    """
    try:
        # Use the gitingest Python package
        # Returns: (summary, tree, content)
        summary, tree, content = ingest(repo_url)
        
        # Combine all sections as recommended in the documentation
        # Format: summary + tree + content
        full_digest = f"{summary}\n\n{tree}\n\n{content}"
        
        return full_digest
    except Exception as e:
        raise Exception(f"Git ingest processing failed: {str(e)}")


def main():
    parser = argparse.ArgumentParser(
        description="Process a repository through GitIngest and return the digest"
    )
    parser.add_argument(
        "--repo-url",
        required=True,
        help="The GitHub repository URL to process"
    )
    
    args = parser.parse_args()
    
    try:
        content = process_git_ingest(args.repo_url)
        
        # Return JSON result
        result = {
            "success": True,
            "content": content,
        }
        print(json.dumps(result))
        sys.exit(0)
    except Exception as e:
        result = {
            "success": False,
            "error": str(e),
        }
        print(json.dumps(result), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
