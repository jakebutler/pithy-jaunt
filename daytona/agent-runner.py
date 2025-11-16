#!/usr/bin/env python3
"""
Pithy Jaunt AI Agent Runner

Generates code patches using LLM providers (OpenAI or Anthropic) based on task descriptions.
Outputs unified diff format that can be applied with git apply.
"""

import argparse
import json
import os
import sys
import subprocess
import re
from pathlib import Path
from typing import Optional, Dict, Any
import signal
from contextlib import contextmanager

# LLM Provider imports
try:
    import openai
except ImportError:
    openai = None

try:
    import anthropic
except ImportError:
    anthropic = None


class TimeoutError(Exception):
    """Raised when an operation times out"""
    pass


@contextmanager
def timeout(seconds: int):
    """Context manager for timing out operations"""
    def timeout_handler(signum, frame):
        raise TimeoutError(f"Operation timed out after {seconds} seconds")
    
    # Set up signal handler
    old_handler = signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(seconds)
    
    try:
        yield
    finally:
        # Restore old handler and cancel alarm
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)


def analyze_codebase(repo_path: Path) -> Dict[str, Any]:
    """
    Analyze the codebase structure to understand the project.
    Returns a dictionary with project metadata.
    """
    analysis = {
        "languages": [],
        "framework": None,
        "package_manager": None,
        "file_structure": [],
    }
    
    # Detect languages by file extensions
    extensions = set()
    for file_path in repo_path.rglob("*"):
        if file_path.is_file():
            ext = file_path.suffix
            if ext:
                extensions.add(ext)
    
    # Map extensions to languages
    lang_map = {
        ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".jsx": "JavaScript",
        ".py": "Python", ".go": "Go", ".rs": "Rust", ".java": "Java",
        ".rb": "Ruby", ".php": "PHP", ".swift": "Swift", ".kt": "Kotlin",
    }
    
    for ext in extensions:
        if ext in lang_map:
            lang = lang_map[ext]
            if lang not in analysis["languages"]:
                analysis["languages"].append(lang)
    
    # Detect framework/package manager
    if (repo_path / "package.json").exists():
        analysis["package_manager"] = "npm"
        try:
            with open(repo_path / "package.json") as f:
                pkg = json.load(f)
                if "next" in pkg.get("dependencies", {}):
                    analysis["framework"] = "Next.js"
                elif "react" in pkg.get("dependencies", {}):
                    analysis["framework"] = "React"
        except:
            pass
    elif (repo_path / "requirements.txt").exists():
        analysis["package_manager"] = "pip"
    elif (repo_path / "go.mod").exists():
        analysis["package_manager"] = "go modules"
    elif (repo_path / "Cargo.toml").exists():
        analysis["package_manager"] = "cargo"
    
    # Get top-level directory structure
    for item in sorted(repo_path.iterdir()):
        if item.is_dir() and not item.name.startswith("."):
            analysis["file_structure"].append(f"{item.name}/")
        elif item.is_file() and not item.name.startswith("."):
            analysis["file_structure"].append(item.name)
    
    return analysis


def load_system_prompt(prompt_file: Path) -> str:
    """Load the system prompt from file"""
    if not prompt_file.exists():
        raise FileNotFoundError(f"System prompt file not found: {prompt_file}")
    
    with open(prompt_file, "r") as f:
        return f.read()


def generate_patch_openai(
    system_prompt: str,
    task_description: str,
    codebase_analysis: Dict[str, Any],
    coderabbit_analysis: Optional[str],
    model: str = "gpt-4o",
    api_key: Optional[str] = None,
) -> str:
    """Generate code patch using OpenAI API"""
    if openai is None:
        raise ImportError("openai package is not installed. Install with: pip install openai")
    
    if not api_key:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
    
    client = openai.OpenAI(api_key=api_key)
    
    # Build user prompt
    user_prompt = f"""Task Description:
{task_description}

Codebase Analysis:
- Languages: {', '.join(codebase_analysis.get('languages', []))}
- Framework: {codebase_analysis.get('framework', 'Unknown')}
- Package Manager: {codebase_analysis.get('package_manager', 'Unknown')}
- Top-level structure: {', '.join(codebase_analysis.get('file_structure', [])[:20])}
"""
    
    if coderabbit_analysis:
        user_prompt += f"\nCodeRabbit Analysis:\n{coderabbit_analysis}\n"
    
    user_prompt += "\nGenerate a unified diff patch that implements the task. Output ONLY the diff, no explanations."
    
    try:
        with timeout(180):  # 3 minute timeout
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.0,  # Deterministic output
                max_tokens=8000,  # Reasonable limit for code generation
            )
            
            patch = response.choices[0].message.content.strip()
            
            # Track token usage
            usage = response.usage
            print(f"[pj] Token usage: {usage.total_tokens} (prompt: {usage.prompt_tokens}, completion: {usage.completion_tokens})", file=sys.stderr)
            
            return patch
    except TimeoutError:
        raise TimeoutError("OpenAI API call timed out after 180 seconds")
    except Exception as e:
        raise RuntimeError(f"OpenAI API error: {str(e)}")


def generate_patch_anthropic(
    system_prompt: str,
    task_description: str,
    codebase_analysis: Dict[str, Any],
    coderabbit_analysis: Optional[str],
    model: str = "claude-3-5-sonnet-20241022",
    api_key: Optional[str] = None,
) -> str:
    """Generate code patch using Anthropic API"""
    if anthropic is None:
        raise ImportError("anthropic package is not installed. Install with: pip install anthropic")
    
    if not api_key:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is required")
    
    client = anthropic.Anthropic(api_key=api_key)
    
    # Build user prompt
    user_prompt = f"""Task Description:
{task_description}

Codebase Analysis:
- Languages: {', '.join(codebase_analysis.get('languages', []))}
- Framework: {codebase_analysis.get('framework', 'Unknown')}
- Package Manager: {codebase_analysis.get('package_manager', 'Unknown')}
- Top-level structure: {', '.join(codebase_analysis.get('file_structure', [])[:20])}
"""
    
    if coderabbit_analysis:
        user_prompt += f"\nCodeRabbit Analysis:\n{coderabbit_analysis}\n"
    
    user_prompt += "\nGenerate a unified diff patch that implements the task. Output ONLY the diff, no explanations."
    
    try:
        with timeout(180):  # 3 minute timeout
            message = client.messages.create(
                model=model,
                max_tokens=8192,
                temperature=0.0,  # Deterministic output
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt},
                ],
            )
            
            patch = message.content[0].text.strip()
            
            # Track token usage
            usage = message.usage
            print(f"[pj] Token usage: {usage.input_tokens} input, {usage.output_tokens} output", file=sys.stderr)
            
            return patch
    except TimeoutError:
        raise TimeoutError("Anthropic API call timed out after 180 seconds")
    except Exception as e:
        raise RuntimeError(f"Anthropic API error: {str(e)}")


def validate_diff_format(patch: str) -> bool:
    """Validate that the patch is in proper unified diff format"""
    lines = patch.split("\n")
    
    # Check for diff header markers
    has_diff_markers = False
    for line in lines:
        if line.startswith("--- ") or line.startswith("+++ "):
            has_diff_markers = True
            break
    
    if not has_diff_markers:
        return False
    
    # Check for at least one hunk (starts with @@)
    has_hunk = any(line.startswith("@@") for line in lines)
    
    return has_hunk


def extract_diff_from_response(response: str) -> str:
    """Extract diff from LLM response, handling markdown code blocks"""
    # Remove markdown code blocks if present
    if "```" in response:
        # Find code blocks
        pattern = r"```(?:diff)?\n?(.*?)```"
        matches = re.findall(pattern, response, re.DOTALL)
        if matches:
            return matches[0].strip()
    
    return response.strip()


def main():
    parser = argparse.ArgumentParser(description="Generate code patch using AI agent")
    parser.add_argument("--prompt-file", type=Path, required=True, help="Path to system prompt file")
    parser.add_argument("--task", type=str, required=True, help="Task description")
    parser.add_argument("--repo-path", type=Path, default=Path.cwd(), help="Path to repository (default: current directory)")
    parser.add_argument("--out", type=Path, required=True, help="Output file for patch")
    parser.add_argument("--provider", type=str, choices=["openai", "anthropic"], default=None, help="LLM provider (default: from MODEL_PROVIDER env var)")
    parser.add_argument("--model", type=str, default=None, help="Model name (default: from MODEL_NAME env var)")
    parser.add_argument("--coderabbit-analysis", type=Path, help="Path to CodeRabbit analysis file (optional)")
    
    args = parser.parse_args()
    
    # Determine provider and model
    provider = args.provider or os.getenv("MODEL_PROVIDER", "openai")
    model = args.model or os.getenv("MODEL_NAME", "gpt-4o" if provider == "openai" else "claude-3-5-sonnet-20241022")
    
    print(f"[pj] Using provider: {provider}, model: {model}", file=sys.stderr)
    
    # Load system prompt
    try:
        system_prompt = load_system_prompt(args.prompt_file)
    except Exception as e:
        print(f"[pj] Error loading system prompt: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Analyze codebase
    try:
        codebase_analysis = analyze_codebase(args.repo_path)
        print(f"[pj] Codebase analysis: {codebase_analysis}", file=sys.stderr)
    except Exception as e:
        print(f"[pj] Warning: Could not analyze codebase: {e}", file=sys.stderr)
        codebase_analysis = {}
    
    # Load CodeRabbit analysis if provided
    coderabbit_analysis = None
    if args.coderabbit_analysis and args.coderabbit_analysis.exists():
        try:
            with open(args.coderabbit_analysis) as f:
                coderabbit_analysis = f.read()
        except Exception as e:
            print(f"[pj] Warning: Could not load CodeRabbit analysis: {e}", file=sys.stderr)
    
    # Generate patch
    try:
        if provider == "openai":
            patch = generate_patch_openai(
                system_prompt,
                args.task,
                codebase_analysis,
                coderabbit_analysis,
                model=model,
            )
        elif provider == "anthropic":
            patch = generate_patch_anthropic(
                system_prompt,
                args.task,
                codebase_analysis,
                coderabbit_analysis,
                model=model,
            )
        else:
            raise ValueError(f"Unknown provider: {provider}")
        
        # Extract diff from response
        patch = extract_diff_from_response(patch)
        
        # Validate format
        if not validate_diff_format(patch):
            print(f"[pj] Warning: Generated patch may not be in valid unified diff format", file=sys.stderr)
            # Still write it out, let git apply handle validation
        
        # Write patch to output file
        with open(args.out, "w") as f:
            f.write(patch)
        
        print(f"[pj] Patch generated successfully: {args.out}", file=sys.stderr)
        
    except TimeoutError as e:
        print(f"[pj] Error: {e}", file=sys.stderr)
        sys.exit(124)  # Standard timeout exit code
    except Exception as e:
        print(f"[pj] Error generating patch: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

