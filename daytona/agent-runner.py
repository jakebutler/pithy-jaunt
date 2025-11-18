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
from typing import Optional, Dict, Any, List, Tuple
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


def get_max_tokens_for_model(provider: str, model: str) -> int:
    """
    Get the maximum completion tokens supported by a model.
    Returns appropriate max_tokens value based on model capabilities.
    """
    model_lower = model.lower()
    
    # OpenAI models
    if provider == "openai" or provider == "openrouter":
        # GPT-4o supports 16384 completion tokens
        if "gpt-4o" in model_lower:
            return 16384
        # GPT-4-turbo supports 4096 completion tokens
        elif "gpt-4-turbo" in model_lower or "gpt-4-1106" in model_lower:
            return 4096
        # GPT-4 base supports 4096
        elif "gpt-4" in model_lower and "turbo" not in model_lower and "o" not in model_lower:
            return 4096
        # GPT-3.5 supports 4096
        elif "gpt-3.5" in model_lower:
            return 4096
        # Kimi K2 has 200K context window, use 100K for completion (safe limit)
        elif "kimi-k2" in model_lower or "moonshotai/kimi" in model_lower:
            return 100000
        # Other OpenRouter models - use conservative default
        elif provider == "openrouter":
            # Default to 32K for OpenRouter models (many support large contexts)
            return 32000
        # Default for OpenAI models
        else:
            return 16384
    
    # Anthropic models
    elif provider == "anthropic":
        # Claude 3.5 Sonnet supports 8192 completion tokens
        if "claude-3-5" in model_lower:
            return 8192
        # Claude 3 Opus supports 4096
        elif "claude-3-opus" in model_lower:
            return 4096
        # Claude 3 Sonnet supports 4096
        elif "claude-3-sonnet" in model_lower:
            return 4096
        # Claude 3 Haiku supports 4096
        elif "claude-3-haiku" in model_lower:
            return 4096
        # Default for Anthropic
        else:
            return 8192
    
    # Unknown provider/model - use conservative default
    return 16384


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


def find_relevant_files(repo_path: Path, task_description: str, max_files: int = 10) -> List[Tuple[str, str]]:
    """
    Find files that are likely relevant to the task.
    Returns a list of (file_path, content) tuples.
    """
    relevant_files = []
    task_lower = task_description.lower()
    
    # First, extract explicit file names mentioned in the task
    # Look for patterns like "README.md", "file.ts", "src/file.js", etc.
    import re
    file_patterns = re.findall(r'\b[\w\-/]+\.\w+\b', task_description)
    explicit_files = []
    for pattern in file_patterns:
        # Try to find the file
        file_path = repo_path / pattern
        if file_path.exists() and file_path.is_file():
            explicit_files.append(file_path)
        else:
            # Try case-insensitive search
            for path in repo_path.rglob("*"):
                if path.is_file() and path.name.lower() == pattern.lower():
                    explicit_files.append(path)
                    break
    
    # Keywords that might indicate which files to read
    keywords = []
    if any(word in task_lower for word in ["api", "route", "endpoint", "handler"]):
        keywords.extend(["api", "route", "handler", "controller"])
    if any(word in task_lower for word in ["component", "ui", "page", "view"]):
        keywords.extend(["component", "page", "view", "ui"])
    if any(word in task_lower for word in ["config", "setting"]):
        keywords.extend(["config", "setting", ".env"])
    if any(word in task_lower for word in ["test", "spec"]):
        keywords.extend(["test", "spec"])
    if any(word in task_lower for word in ["readme", "read me"]):
        keywords.extend(["readme"])
    
    # Find files matching keywords or common patterns
    files_to_check = list(explicit_files)  # Start with explicitly mentioned files
    for file_path in repo_path.rglob("*"):
        if file_path.is_file() and not any(part.startswith(".") for part in file_path.parts):
            # Skip if already in explicit files
            if file_path in files_to_check:
                continue
                
            # Skip large files and binary files
            if file_path.stat().st_size > 100000:  # Skip files > 100KB
                continue
            
            file_name = file_path.name.lower()
            file_path_str = str(file_path.relative_to(repo_path))
            
            # Check if file matches keywords or is in common directories
            if any(keyword in file_name or keyword in file_path_str.lower() for keyword in keywords):
                files_to_check.append(file_path)
            elif any(part in ["src", "lib", "app", "components", "pages", "api"] for part in file_path.parts):
                files_to_check.append(file_path)
    
    # Read file contents
    # For explicitly mentioned files, read the full content (up to a reasonable limit)
    # For other files, truncate to save tokens
    for file_path in files_to_check[:max_files]:
        try:
            # Try to read as text
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                # For explicitly mentioned files, read the FULL content (up to 50KB for markdown/text files)
                # For other files, limit to 5KB
                is_explicit = file_path in explicit_files
                # For markdown and text files, allow much larger content
                is_text_file = file_path.suffix in ['.md', '.txt', '.rst', '.adoc'] or 'readme' in file_path.name.lower()
                if is_explicit and is_text_file:
                    max_size = 50000  # 50KB for text files that are explicitly mentioned
                elif is_explicit:
                    max_size = 20000  # 20KB for other explicitly mentioned files
                else:
                    max_size = 5000   # 5KB for other files
                    
                if len(content) > max_size:
                    content = content[:max_size] + "\n... (truncated at " + str(max_size) + " characters)"
                relevant_files.append((str(file_path.relative_to(repo_path)), content))
        except Exception:
            # Skip files that can't be read
            continue
    
    return relevant_files


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
    relevant_files: List[Tuple[str, str]],
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
    
    # Include relevant file contents
    if relevant_files:
        user_prompt += "\n\nRelevant Files (these files EXIST and should be MODIFIED, not created):\n"
        for file_path, content in relevant_files:
            # Add line numbers to help the agent understand the file structure
            lines = content.split('\n')
            line_count = len(lines)
            user_prompt += f"\n--- File: {file_path} ({line_count} lines total) ---\n"
            # For files that might be truncated, show first and last portions
            if "... (truncated" in content:
                # Show first 100 lines and last 50 lines
                first_lines = '\n'.join(lines[:100])
                last_lines = '\n'.join(lines[-50:]) if len(lines) > 150 else ""
                if last_lines:
                    user_prompt += f"{first_lines}\n... (middle section truncated) ...\n{last_lines}\n"
                else:
                    user_prompt += f"{content}\n"
            else:
                # Show full content with line numbers for reference (first 10 chars of line number for alignment)
                numbered_lines = [f"{i+1:4d}| {line}" for i, line in enumerate(lines)]
                user_prompt += '\n'.join(numbered_lines) + "\n"
    
    if coderabbit_analysis:
        user_prompt += f"\n\nCodeRabbit Analysis:\n{coderabbit_analysis}\n"
    
    user_prompt += "\n\nGenerate a unified diff patch that implements the task.\n\n**CRITICAL INSTRUCTIONS:**\n1. **If a file is shown above, it EXISTS and must be MODIFIED, not created**\n2. **Check if the content you're trying to add already exists** - if it does, modify the existing content instead of adding duplicates\n3. Use the EXACT context lines from the files shown above - copy them character-for-character\n4. Do NOT modify, reformat, or guess any context lines\n5. Ensure all whitespace (spaces, tabs, newlines) matches exactly\n6. **Include at least 3 lines of context BEFORE and AFTER each change** - this is critical for git apply to work\n7. Verify the hunk line numbers (the @@ lines) match the actual line positions in the file\n8. **For existing files**: The hunk must start with a line number > 0 (e.g., @@ -1,10 +1,12 @@), NOT @@ -0,0 +1,10 @@\n9. **@@ -0,0 +X,Y @@ means creating a NEW file - only use this if the file is NOT shown above**\n10. **Complete the patch fully** - do not leave incomplete lines or sections\n11. **End the patch properly** - ensure the last line is complete and the patch is valid\n12. **The patch must include context lines after the change** - show what comes after your changes so git apply knows where the hunk ends\n\nOutput ONLY the unified diff, with no explanations, no markdown formatting, no code blocks - just the raw diff text."
    
    try:
        with timeout(180):  # 3 minute timeout
            max_tokens = get_max_tokens_for_model(provider, model)
            print(f"[pj] Using max_tokens={max_tokens} for model {model} (provider: {provider})", file=sys.stderr)
            
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.0,  # Deterministic output
                max_tokens=max_tokens,  # Model-specific limit
            )
            
            # Safely extract content and metadata
            if not response.choices or len(response.choices) == 0:
                raise RuntimeError("No choices in API response")
            
            choice = response.choices[0]
            if not hasattr(choice, 'message') or not choice.message:
                raise RuntimeError("No message in API response choice")
            
            if not hasattr(choice.message, 'content') or not choice.message.content:
                raise RuntimeError("No content in API response message")
            
            patch = choice.message.content.strip()
            
            # Track token usage
            usage = getattr(response, 'usage', None)
            if usage:
                print(f"[pj] Token usage: {usage.total_tokens} (prompt: {usage.prompt_tokens}, completion: {usage.completion_tokens})", file=sys.stderr)
            
            # Check if response was truncated (finish_reason indicates truncation)
            finish_reason = getattr(choice, 'finish_reason', None)
            if finish_reason == "length":
                print(f"[pj] Warning: Response was truncated (finish_reason: {finish_reason}). Patch may be incomplete.", file=sys.stderr)
            
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
    relevant_files: List[Tuple[str, str]],
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
    
    # Include relevant file contents
    if relevant_files:
        user_prompt += "\n\nRelevant Files (these files EXIST and should be MODIFIED, not created):\n"
        for file_path, content in relevant_files:
            # Add line numbers to help the agent understand the file structure
            lines = content.split('\n')
            line_count = len(lines)
            user_prompt += f"\n--- File: {file_path} ({line_count} lines total) ---\n"
            # For files that might be truncated, show first and last portions
            if "... (truncated" in content:
                # Show first 100 lines and last 50 lines
                first_lines = '\n'.join(lines[:100])
                last_lines = '\n'.join(lines[-50:]) if len(lines) > 150 else ""
                if last_lines:
                    user_prompt += f"{first_lines}\n... (middle section truncated) ...\n{last_lines}\n"
                else:
                    user_prompt += f"{content}\n"
            else:
                # Show full content with line numbers for reference (first 10 chars of line number for alignment)
                numbered_lines = [f"{i+1:4d}| {line}" for i, line in enumerate(lines)]
                user_prompt += '\n'.join(numbered_lines) + "\n"
    
    if coderabbit_analysis:
        user_prompt += f"\n\nCodeRabbit Analysis:\n{coderabbit_analysis}\n"
    
    user_prompt += "\n\nGenerate a unified diff patch that implements the task.\n\n**CRITICAL INSTRUCTIONS:**\n1. **If a file is shown above, it EXISTS and must be MODIFIED, not created**\n2. **Check if the content you're trying to add already exists** - if it does, modify the existing content instead of adding duplicates\n3. Use the EXACT context lines from the files shown above - copy them character-for-character\n4. Do NOT modify, reformat, or guess any context lines\n5. Ensure all whitespace (spaces, tabs, newlines) matches exactly\n6. **Include at least 3 lines of context BEFORE and AFTER each change** - this is critical for git apply to work\n7. Verify the hunk line numbers (the @@ lines) match the actual line positions in the file\n8. **For existing files**: The hunk must start with a line number > 0 (e.g., @@ -1,10 +1,12 @@), NOT @@ -0,0 +1,10 @@\n9. **@@ -0,0 +X,Y @@ means creating a NEW file - only use this if the file is NOT shown above**\n10. **Complete the patch fully** - do not leave incomplete lines or sections\n11. **End the patch properly** - ensure the last line is complete and the patch is valid\n12. **The patch must include context lines after the change** - show what comes after your changes so git apply knows where the hunk ends\n\nOutput ONLY the unified diff, with no explanations, no markdown formatting, no code blocks - just the raw diff text."
    
    try:
        with timeout(180):  # 3 minute timeout
            message = client.messages.create(
                model=model,
                max_tokens=16384,  # Increased limit for larger patches
                temperature=0.0,  # Deterministic output
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt},
                ],
            )
            
            # Safely extract content from Anthropic response
            if not hasattr(message, 'content') or not message.content or len(message.content) == 0:
                raise RuntimeError("No content in Anthropic API response")
            
            if not hasattr(message.content[0], 'text') or not message.content[0].text:
                raise RuntimeError("No text in Anthropic API response content")
            
            patch = message.content[0].text.strip()
            
            # Track token usage
            usage = getattr(message, 'usage', None)
            if usage:
                print(f"[pj] Token usage: {usage.input_tokens} input, {usage.output_tokens} output", file=sys.stderr)
            
            # Check if response was truncated (stop_reason indicates truncation)
            stop_reason = getattr(message, 'stop_reason', None)
            if stop_reason == "max_tokens":
                print(f"[pj] Warning: Response was truncated (stop_reason: {stop_reason}). Patch may be incomplete.", file=sys.stderr)
            
            return patch
    except TimeoutError:
        raise TimeoutError("Anthropic API call timed out after 180 seconds")
    except Exception as e:
        raise RuntimeError(f"Anthropic API error: {str(e)}")


def validate_diff_format(patch: str) -> Tuple[bool, List[str]]:
    """
    Validate that the patch is in proper unified diff format.
    Returns (is_valid, list_of_errors)
    """
    errors = []
    lines = patch.split("\n")
    
    if not patch.strip():
        return False, ["Patch is empty"]
    
    # Check for diff header markers
    has_diff_markers = False
    has_file_headers = False
    for i, line in enumerate(lines):
        if line.startswith("--- "):
            has_diff_markers = True
            # Check if next line is +++
            if i + 1 < len(lines) and lines[i + 1].startswith("+++ "):
                has_file_headers = True
            break
    
    if not has_diff_markers:
        errors.append("Missing diff header markers (--- or +++ lines)")
    
    if not has_file_headers:
        errors.append("Missing file header pair (--- and +++ must be consecutive)")
    
    # Check for at least one hunk (starts with @@)
    hunk_lines = [line for line in lines if line.startswith("@@")]
    if not hunk_lines:
        errors.append("Missing diff hunk markers (@@ lines)")
        return False, errors
    
    # Validate each hunk format and content
    for hunk_idx, hunk_line in enumerate(hunk_lines):
        # Hunk should match: @@ -start,count +start,count @@
        hunk_match = re.match(r"^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@", hunk_line)
        if not hunk_match:
            errors.append(f"Invalid hunk format: {hunk_line}")
            continue
        
        old_start = int(hunk_match.group(1))
        old_count = int(hunk_match.group(2)) if hunk_match.group(2) else 1
        new_start = int(hunk_match.group(3))
        new_count = int(hunk_match.group(4)) if hunk_match.group(4) else 1
        
        # Find the lines in this hunk (from this @@ to the next @@ or end)
        hunk_start_idx = lines.index(hunk_line)
        if hunk_idx + 1 < len(hunk_lines):
            hunk_end_idx = lines.index(hunk_lines[hunk_idx + 1])
        else:
            hunk_end_idx = len(lines)
        
        hunk_content = lines[hunk_start_idx + 1:hunk_end_idx]
        
        # Count lines in hunk
        context_lines = [l for l in hunk_content if l.startswith(" ")]
        remove_lines = [l for l in hunk_content if l.startswith("-")]
        add_lines = [l for l in hunk_content if l.startswith("+")]
        
        total_old_lines = len(context_lines) + len(remove_lines)
        total_new_lines = len(context_lines) + len(add_lines)
        
        # Validate line counts match hunk header
        if total_old_lines != old_count:
            errors.append(f"Hunk {hunk_idx + 1}: Expected {old_count} old lines (context + removes), but found {total_old_lines} (context: {len(context_lines)}, removes: {len(remove_lines)})")
        
        if total_new_lines != new_count:
            errors.append(f"Hunk {hunk_idx + 1}: Expected {new_count} new lines (context + adds), but found {total_new_lines} (context: {len(context_lines)}, adds: {len(add_lines)})")
        
        # Check for context lines before and after changes
        if hunk_content:
            # Check if there are context lines before first change
            first_change_idx = next((i for i, l in enumerate(hunk_content) if l.startswith(("-", "+"))), None)
            if first_change_idx is not None and first_change_idx == 0:
                errors.append(f"Hunk {hunk_idx + 1}: Missing context lines before changes (should have at least 3 lines of context before first - or +)")
            
            # Check if there are context lines after last change
            last_change_idx = next((i for i in range(len(hunk_content) - 1, -1, -1) if hunk_content[i].startswith(("-", "+"))), None)
            if last_change_idx is not None and last_change_idx == len(hunk_content) - 1:
                errors.append(f"Hunk {hunk_idx + 1}: Missing context lines after changes (should have at least 3 lines of context after last - or +)")
    
    # Check for context lines (lines starting with space, -, or +)
    has_context = any(
        line.startswith((" ", "-", "+")) and not line.startswith("---") and not line.startswith("+++")
        for line in lines
    )
    if not has_context:
        errors.append("Missing context lines (lines starting with space, -, or +)")
    
    # Check for balanced file headers
    file_headers = [line for line in lines if line.startswith("--- ") or line.startswith("+++ ")]
    if len(file_headers) % 2 != 0:
        errors.append("Unbalanced file headers (--- and +++ should come in pairs)")
    
    is_valid = len(errors) == 0
    return is_valid, errors


def extract_diff_from_response(response: str) -> str:
    """Extract diff from LLM response, handling markdown code blocks"""
    # Remove markdown code blocks if present
    if "```" in response:
        # Find code blocks
        pattern = r"```(?:diff)?\n?(.*?)```"
        matches = re.findall(pattern, response, re.DOTALL)
        if matches:
            response = matches[0].strip()
    
    # Clean up the response - remove any shell artifacts or trailing garbage
    lines = response.split('\n')
    cleaned_lines = []
    for line in lines:
        # Stop at shell artifacts or error messages
        if any(artifact in line for artifact in ['dump_bash_state', 'command not found', 'Error:', 'Traceback']):
            break
        cleaned_lines.append(line)
    
    # Join and strip
    cleaned = '\n'.join(cleaned_lines).strip()
    
    # Ensure it ends with a newline if it's not empty
    if cleaned and not cleaned.endswith('\n'):
        cleaned += '\n'
    
    return cleaned


def generate_modified_file_content(
    system_prompt: str,
    task_description: str,
    codebase_analysis: Dict[str, Any],
    coderabbit_analysis: Optional[str],
    relevant_files: List[Tuple[str, str]],
    model: str = "gpt-4o",
    provider: str = "openai",
    api_key: Optional[str] = None,
) -> Dict[str, str]:
    """
    Generate modified file content using two-step approach.
    Returns a dict mapping file_path -> modified_content.
    """
    if provider == "openai":
        if openai is None:
            raise ImportError("openai package is not installed. Install with: pip install openai")
        if not api_key:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable is required")
        client = openai.OpenAI(api_key=api_key)
    elif provider == "anthropic":
        if anthropic is None:
            raise ImportError("anthropic package is not installed. Install with: pip install anthropic")
        if not api_key:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY environment variable is required")
        client = anthropic.Anthropic(api_key=api_key)
    elif provider == "openrouter":
        # OpenRouter uses OpenAI-compatible API
        if openai is None:
            raise ImportError("openai package is not installed. Install with: pip install openai")
        if not api_key:
            api_key = os.getenv("OPENROUTER_API_KEY")
            if not api_key:
                raise ValueError("OPENROUTER_API_KEY environment variable is required")
        # OpenRouter uses OpenAI client with base_url and default_headers
        client = openai.OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
            default_headers={
                "HTTP-Referer": os.getenv("OPENROUTER_HTTP_REFERER", "https://github.com/jakebutler/pithy-jaunt"),
                "X-Title": "Pithy Jaunt",
            },
        )
    else:
        raise ValueError(f"Unknown provider: {provider}")
    
    # Build user prompt - ask for complete modified file content
    user_prompt = f"""Task Description:
{task_description}

Codebase Analysis:
- Languages: {', '.join(codebase_analysis.get('languages', []))}
- Framework: {codebase_analysis.get('framework', 'Unknown')}
- Package Manager: {codebase_analysis.get('package_manager', 'Unknown')}
- Top-level structure: {', '.join(codebase_analysis.get('file_structure', [])[:20])}
"""
    
    # Include relevant file contents for context
    # Extract explicitly mentioned files from task description
    explicit_files = []
    task_lower = task_description.lower()
    for file_path, content in relevant_files:
        # Check if file path is explicitly mentioned in task
        file_name = file_path.split('/')[-1]
        if file_path in task_description or file_name in task_description:
            explicit_files.append((file_path, content))
    
    if relevant_files:
        if explicit_files:
            user_prompt += f"\n\nFiles to MODIFY (explicitly mentioned in task - generate modified content for these):\n"
            for file_path, content in explicit_files:
                lines = content.split('\n')
                line_count = len(lines)
                user_prompt += f"\n--- File: {file_path} ({line_count} lines total) ---\n"
                if "... (truncated" in content:
                    first_lines = '\n'.join(lines[:100])
                    last_lines = '\n'.join(lines[-50:]) if len(lines) > 150 else ""
                    if last_lines:
                        user_prompt += f"{first_lines}\n... (middle section truncated) ...\n{last_lines}\n"
                    else:
                        user_prompt += f"{content}\n"
                else:
                    numbered_lines = [f"{i+1:4d}| {line}" for i, line in enumerate(lines)]
                    user_prompt += '\n'.join(numbered_lines) + "\n"
        
        # Show other relevant files for context only
        context_files = [(fp, c) for fp, c in relevant_files if (fp, c) not in explicit_files]
        if context_files:
            user_prompt += f"\n\nContext Files (for reference only - DO NOT modify these):\n"
            for file_path, content in context_files[:5]:  # Limit to 5 context files
                lines = content.split('\n')
                line_count = len(lines)
                user_prompt += f"\n--- File: {file_path} ({line_count} lines total) - CONTEXT ONLY ---\n"
                # Show only first 50 lines for context
                if len(lines) > 50:
                    user_prompt += '\n'.join(lines[:50]) + "\n... (truncated for context) ...\n"
                else:
                    user_prompt += '\n'.join(lines) + "\n"
        
        # Legacy format for backward compatibility if no explicit files found
        if not explicit_files and not context_files:
            user_prompt += "\n\nRelevant Files (check task description to see which ones to modify):\n"
            for file_path, content in relevant_files:
                lines = content.split('\n')
                line_count = len(lines)
                user_prompt += f"\n--- File: {file_path} ({line_count} lines total) ---\n"
                if "... (truncated" in content:
                    first_lines = '\n'.join(lines[:100])
                    last_lines = '\n'.join(lines[-50:]) if len(lines) > 150 else ""
                    if last_lines:
                        user_prompt += f"{first_lines}\n... (middle section truncated) ...\n{last_lines}\n"
                    else:
                        user_prompt += f"{content}\n"
                else:
                    numbered_lines = [f"{i+1:4d}| {line}" for i, line in enumerate(lines)]
                    user_prompt += '\n'.join(numbered_lines) + "\n"
    
    if coderabbit_analysis:
        user_prompt += f"\n\nCodeRabbit Analysis:\n{coderabbit_analysis}\n"
    
    user_prompt += """

Generate the COMPLETE modified file content that implements the task.

**CRITICAL INSTRUCTIONS:**
1. **Output the COMPLETE file content** - not a diff, not a patch, but the full modified file
2. **For each file shown above**, output the complete modified version
3. **Preserve all existing content** that should not change - copy it exactly
4. **Make only the necessary changes** to implement the task
5. **Maintain exact formatting** - preserve whitespace, indentation, line endings
6. **If a file is shown above, it EXISTS** - you are modifying it, not creating it
7. **Check if content already exists** - if it does, modify existing content instead of adding duplicates

**Output Format:**
For each file to modify, output:
```
FILE: <file_path>
<complete file content here>
---
```

Example:
```
FILE: README.md
# Project Name

## Description
...

## New Section Added Here
...
---
```

Output ONLY the file content(s), with no explanations, no markdown formatting around the content itself."""
    
    try:
        with timeout(180):  # 3 minute timeout
            finish_reason = None
            max_tokens = get_max_tokens_for_model(provider, model)
            print(f"[pj] Using max_tokens={max_tokens} for model {model} (provider: {provider})", file=sys.stderr)
            
            if provider == "openai" or provider == "openrouter":
                # Both OpenAI and OpenRouter use OpenAI-compatible API
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.0,
                    max_tokens=max_tokens,  # Model-specific limit
                )
                # Safely extract content and metadata
                if not response.choices or len(response.choices) == 0:
                    raise RuntimeError("No choices in API response")
                
                choice = response.choices[0]
                if not hasattr(choice, 'message') or not choice.message:
                    raise RuntimeError("No message in API response choice")
                
                if not hasattr(choice.message, 'content') or not choice.message.content:
                    raise RuntimeError("No content in API response message")
                
                content = choice.message.content.strip()
                finish_reason = getattr(choice, 'finish_reason', None)  # finish_reason is on the choice, not the message
                usage = getattr(response, 'usage', None)
                
                if usage:
                    print(f"[pj] Token usage: {usage.total_tokens} (prompt: {usage.prompt_tokens}, completion: {usage.completion_tokens})", file=sys.stderr)
                
                if finish_reason == "length":
                    print(f"[pj] WARNING: LLM response was truncated (finish_reason: length). Content may be incomplete.", file=sys.stderr)
            else:  # anthropic
                message = client.messages.create(
                    model=model,
                    max_tokens=max_tokens,  # Model-specific limit
                    temperature=0.0,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_prompt},
                    ],
                )
                # Safely extract content from Anthropic response
                if not hasattr(message, 'content') or not message.content or len(message.content) == 0:
                    raise RuntimeError("No content in Anthropic API response")
                
                if not hasattr(message.content[0], 'text') or not message.content[0].text:
                    raise RuntimeError("No text in Anthropic API response content")
                
                content = message.content[0].text.strip()
                finish_reason = getattr(message, 'stop_reason', None)
                usage = getattr(message, 'usage', None)
                
                if usage:
                    print(f"[pj] Token usage: {usage.input_tokens} input, {usage.output_tokens} output", file=sys.stderr)
                
                if finish_reason == "max_tokens":
                    print(f"[pj] WARNING: LLM response was truncated (stop_reason: max_tokens). Content may be incomplete.", file=sys.stderr)
            
            # Parse the response to extract file contents
            modified_files = {}
            current_file = None
            current_content = []
            
            # Clean content - remove any markdown code blocks that might have been added
            if "```" in content:
                # Try to extract content from code blocks
                import re
                code_block_pattern = r"```(?:[a-z]+)?\n?(.*?)```"
                matches = re.findall(code_block_pattern, content, re.DOTALL)
                if matches:
                    # Use content from code blocks
                    content = matches[-1].strip()  # Use last match (most likely the actual content)
                    print(f"[pj] Extracted content from markdown code block", file=sys.stderr)
            
            for line in content.split('\n'):
                # Stop parsing if we hit debug/error messages
                if any(artifact in line.lower() for artifact in ['patch preview', 'error:', 'traceback', 'debug:', 'warning:']):
                    print(f"[pj] WARNING: Stopping file parsing at line containing: {line[:50]}", file=sys.stderr)
                    break
                    
                if line.startswith('FILE: '):
                    # Save previous file if any
                    if current_file and current_content:
                        file_content = '\n'.join(current_content).rstrip() + '\n'
                        # Validate content is not empty and doesn't look corrupted
                        if file_content.strip() and not file_content.startswith('\\n'):
                            modified_files[current_file] = file_content
                        else:
                            print(f"[pj] WARNING: Skipping corrupted file content for {current_file}", file=sys.stderr)
                    # Start new file
                    current_file = line[6:].strip()  # Remove 'FILE: ' prefix
                    current_content = []
                elif line == '---' and current_file:
                    # End of file
                    if current_content:
                        file_content = '\n'.join(current_content).rstrip() + '\n'
                        # Validate content is not empty and doesn't look corrupted
                        if file_content.strip() and not file_content.startswith('\\n'):
                            modified_files[current_file] = file_content
                        else:
                            print(f"[pj] WARNING: Skipping corrupted file content for {current_file}", file=sys.stderr)
                    current_file = None
                    current_content = []
                elif current_file:
                    # Skip lines that look like debug output
                    if not any(artifact in line.lower() for artifact in ['patch preview', 'error:', 'traceback']):
                        current_content.append(line)
            
            # Save last file if any
            if current_file and current_content:
                file_content = '\n'.join(current_content).rstrip() + '\n'
                # Validate content is not empty and doesn't look corrupted
                if file_content.strip() and not file_content.startswith('\\n'):
                    modified_files[current_file] = file_content
                else:
                    print(f"[pj] WARNING: Skipping corrupted file content for {current_file}", file=sys.stderr)
            
            # Validate we got at least one file
            if not modified_files:
                print(f"[pj] ERROR: No valid file content extracted from LLM response", file=sys.stderr)
                print(f"[pj] Response preview (first 1000 chars): {content[:1000]}", file=sys.stderr)
                print(f"[pj] Response length: {len(content)} characters", file=sys.stderr)
                
                # Check if response looks like documentation/instructions instead of file content
                if any(indicator in content[:200].lower() for indicator in [
                    '##', '###', '**', '* ', '- ', '1.', '2.', 
                    'use ', 'to create', 'to edit', 'instructions',
                    'guide', 'tutorial', 'documentation'
                ]) and 'FILE:' not in content:
                    error_msg = (
                        "LLM returned documentation/instructions instead of file content format. "
                        "Expected format: 'FILE: <path>\\n<content>\\n---'. "
                        "The LLM may have misunderstood the task or the system prompt was not used correctly."
                    )
                    print(f"[pj] {error_msg}", file=sys.stderr)
                    raise RuntimeError(error_msg)
                
                raise RuntimeError("Failed to extract file content from LLM response. Response may be truncated or malformed. Expected format: 'FILE: <path>\\n<content>\\n---'")
            
            # Validate file contents don't contain obvious corruption
            for file_path, file_content in modified_files.items():
                # Check for literal \n sequences (should be actual newlines)
                if '\\n' in file_content and file_content.count('\\n') > file_content.count('\n'):
                    print(f"[pj] WARNING: File {file_path} contains literal \\n sequences - may be corrupted", file=sys.stderr)
                # Check for incomplete content (ends mid-sentence or has placeholder text)
                if file_content.strip().endswith(('...', '...\n', 'TODO', 'FIXME')):
                    print(f"[pj] WARNING: File {file_path} may be incomplete (ends with placeholder)", file=sys.stderr)
            
            return modified_files
            
    except TimeoutError:
        raise TimeoutError(f"{provider} API call timed out after 180 seconds")
    except Exception as e:
        raise RuntimeError(f"{provider} API error: {str(e)}")


def generate_patch_from_modified_files(
    repo_path: Path,
    modified_files: Dict[str, str],
    output_patch: Path,
) -> str:
    """
    Generate unified diff patch from modified file contents using git diff.
    """
    import tempfile
    import subprocess
    
    patches = []
    
    for file_path, modified_content in modified_files.items():
        original_file = repo_path / file_path
        
        # Verify the file path is correct
        if not original_file.exists():
            # Try to find the file with case-insensitive search
            found = False
            for path in repo_path.rglob("*"):
                if path.is_file() and path.name.lower() == original_file.name.lower():
                    original_file = path
                    found = True
                    print(f"[pj] Found file with different case: {original_file}", file=sys.stderr)
                    break
            
            if not found:
                # New file
                with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.tmp') as f:
                    f.write(modified_content)
                    temp_file = f.name
                
                try:
                    # Use git diff --no-index to create patch for new file
                    result = subprocess.run(
                        ['git', 'diff', '--no-index', '--', '/dev/null', temp_file],
                        capture_output=True,
                        text=True,
                        cwd=repo_path,
                    )
                    
                    if result.returncode != 1:
                        # git diff returns 1 when files differ (which is what we want for new files)
                        # 0 means no differences (shouldn't happen for new file)
                        # >1 means error
                        if result.returncode == 0:
                            print(f"[pj] Warning: No differences found for new file {file_path}", file=sys.stderr)
                        else:
                            raise RuntimeError(f"git diff failed with exit code {result.returncode}: {result.stderr}")
                    
                    # Replace temp file paths with actual file paths
                    # git diff outputs: --- /dev/null, +++ b/tmp/... 
                    # For new files, we keep /dev/null in --- line, only replace +++ line
                    # Format should be: --- /dev/null, +++ b/file_path
                    patch_content = result.stdout
                    import re
                    # Replace the temp file path in +++ line
                    # git diff outputs: +++ b/tmp/... or +++ b/var/folders/...
                    # We need: +++ b/file_path
                    # Match +++ b/ followed by any path (including temp file path)
                    patch_content = re.sub(
                        r'\+\+\+ b/[^\s]+',
                        f'+++ b/{file_path}',
                        patch_content
                    )
                    # Fix the diff --git line
                    # Format: diff --git /dev/null b/tmp/...
                    # We need: diff --git a/file_path b/file_path
                    # For new files, git diff uses /dev/null, but unified diff format uses a/file_path
                    patch_content = re.sub(
                        r'diff --git /dev/null b/[^\s]+',
                        f'diff --git a/{file_path} b/{file_path}',
                        patch_content
                    )
                    # Also handle case where diff --git might have different format
                    patch_content = re.sub(
                        r'diff --git [^\s]+ [^\s]+',
                        f'diff --git a/{file_path} b/{file_path}',
                        patch_content,
                        count=1  # Only replace first occurrence per patch
                    )
                    patches.append(patch_content)
                finally:
                    os.unlink(temp_file)
        else:
            # Modified file
            # Read original content - use the same encoding and method as find_relevant_files
            try:
                with open(original_file, 'r', encoding='utf-8', errors='ignore') as f:
                    original_content = f.read()
            except Exception as e:
                raise RuntimeError(f"Failed to read original file {file_path}: {e}")
            
            # Normalize line endings to ensure consistency
            # Convert all line endings to \n (Unix style)
            original_content = original_content.replace('\r\n', '\n').replace('\r', '\n')
            modified_content = modified_content.replace('\r\n', '\n').replace('\r', '\n')
            
            # Write modified content to temp file
            with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.tmp', encoding='utf-8') as f:
                f.write(modified_content)
                temp_file = f.name
            
            try:
                # Use git diff --no-index to create patch
                # Use --ignore-space-at-eol to handle minor whitespace differences
                result = subprocess.run(
                    ['git', 'diff', '--no-index', '--ignore-space-at-eol', '--', str(original_file), temp_file],
                    capture_output=True,
                    text=True,
                    cwd=repo_path,
                )
                
                if result.returncode == 0:
                    # No differences - empty patch
                    print(f"[pj] Warning: No differences found for {file_path}", file=sys.stderr)
                elif result.returncode == 1:
                    # Has differences - this is what we want
                    patch_content = result.stdout
                    # Replace temp file paths with actual file paths
                    import re
                    # Replace the original file path (absolute) with relative path
                    # Handle both absolute paths and relative paths in the patch
                    patch_content = re.sub(r'--- a/[^\s]+', f'--- a/{file_path}', patch_content)
                    patch_content = re.sub(r'\+\+\+ b/[^\s]+', f'+++ b/{file_path}', patch_content)
                    # Also fix the diff --git line if it has absolute paths
                    patch_content = re.sub(
                        r'diff --git [^\s]+ [^\s]+',
                        f'diff --git a/{file_path} b/{file_path}',
                        patch_content,
                        count=1  # Only replace first occurrence per patch
                    )
                    patches.append(patch_content)
                else:
                    raise RuntimeError(f"git diff failed with exit code {result.returncode}: {result.stderr}")
            finally:
                os.unlink(temp_file)
    
    # Combine all patches
    combined_patch = ''.join(patches)
    
    # Write to output file
    with open(output_patch, 'w') as f:
        f.write(combined_patch)
    
    return combined_patch


def main():
    parser = argparse.ArgumentParser(description="Generate code patch using AI agent")
    parser.add_argument("--prompt-file", type=Path, required=True, help="Path to system prompt file")
    parser.add_argument("--task", type=str, required=True, help="Task description")
    parser.add_argument("--repo-path", type=Path, default=Path.cwd(), help="Path to repository (default: current directory)")
    parser.add_argument("--out", type=Path, required=True, help="Output file for patch")
    parser.add_argument("--provider", type=str, choices=["openai", "anthropic", "openrouter"], default=None, help="LLM provider (default: from MODEL_PROVIDER env var)")
    parser.add_argument("--model", type=str, default=None, help="Model name (default: from MODEL_NAME env var)")
    parser.add_argument("--coderabbit-analysis", type=Path, help="Path to CodeRabbit analysis file (optional)")
    parser.add_argument("--use-two-step", action="store_true", default=True, help="Use two-step approach (generate file, then diff) - default: true")
    
    args = parser.parse_args()
    
    # Determine provider and model
    provider = args.provider or os.getenv("MODEL_PROVIDER", "openai")
    if not args.model:
        # Set default model based on provider
        if provider == "openai":
            model = os.getenv("MODEL_NAME", "gpt-4o")
        elif provider == "anthropic":
            model = os.getenv("MODEL_NAME", "claude-3-5-sonnet-20241022")
        elif provider == "openrouter":
            model = os.getenv("MODEL_NAME", "moonshotai/kimi-k2-0905")  # Default to Kimi K2
        else:
            model = os.getenv("MODEL_NAME", "gpt-4o")
    else:
        model = args.model
    
    print(f"[pj] Using provider: {provider}, model: {model}", file=sys.stderr)
    
    # Load system prompt
    try:
        # Use file generation prompt for two-step approach, otherwise use diff prompt
        if args.use_two_step:
            prompt_file = args.prompt_file.parent / "system-prompt-file-generation.md"
            if not prompt_file.exists():
                # Fall back to original prompt if file generation prompt doesn't exist
                prompt_file = args.prompt_file
                print(f"[pj] Warning: system-prompt-file-generation.md not found, using {args.prompt_file}", file=sys.stderr)
            system_prompt = load_system_prompt(prompt_file)
        else:
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
    
    # Find relevant files based on task
    try:
        relevant_files = find_relevant_files(args.repo_path, args.task, max_files=10)
        print(f"[pj] Found {len(relevant_files)} relevant files", file=sys.stderr)
        for file_path, _ in relevant_files:
            print(f"[pj]   - {file_path}", file=sys.stderr)
    except Exception as e:
        print(f"[pj] Warning: Could not find relevant files: {e}", file=sys.stderr)
        relevant_files = []
    
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
        if args.use_two_step:
            # Two-step approach: generate modified file, then use git diff
            print(f"[pj] Using two-step approach: generate modified file, then create diff", file=sys.stderr)
            
            # Determine API key
            api_key = None
            if provider == "openai":
                api_key = os.getenv("OPENAI_API_KEY")
            elif provider == "anthropic":
                api_key = os.getenv("ANTHROPIC_API_KEY")
            elif provider == "openrouter":
                api_key = os.getenv("OPENROUTER_API_KEY")
            
            # Generate modified file content
            modified_files = generate_modified_file_content(
                system_prompt,
                args.task,
                codebase_analysis,
                coderabbit_analysis,
                relevant_files,
                model=model,
                provider=provider,
                api_key=api_key,
            )
            
            if not modified_files:
                raise RuntimeError("No modified files generated")
            
            print(f"[pj] Generated modified content for {len(modified_files)} file(s):", file=sys.stderr)
            for file_path in modified_files:
                print(f"[pj]   - {file_path}", file=sys.stderr)
            
            # Generate patch using git diff
            patch = generate_patch_from_modified_files(
                args.repo_path,
                modified_files,
                args.out,
            )
            
            # Validate the generated patch
            if not patch or not patch.strip():
                raise RuntimeError("Generated patch is empty")
            
            # Check for obvious corruption in the patch
            if '\\n' in patch and patch.count('\\n') > patch.count('\n') * 2:
                print(f"[pj] WARNING: Patch contains many literal \\n sequences - may be corrupted", file=sys.stderr)
            
            # Validate patch format
            if not patch.startswith(('--- ', 'diff --git')):
                print(f"[pj] WARNING: Patch doesn't start with expected header (--- or diff --git)", file=sys.stderr)
                print(f"[pj] Patch preview (first 200 chars): {patch[:200]}", file=sys.stderr)
            
            print(f"[pj] Patch generated successfully using git diff: {args.out}", file=sys.stderr)
            print(f"[pj] Patch size: {len(patch)} characters, {len(patch.splitlines())} lines", file=sys.stderr)
            
        else:
            # Original approach: generate diff directly
            print(f"[pj] Using direct diff generation approach", file=sys.stderr)
            
            if provider == "openai":
                patch = generate_patch_openai(
                    system_prompt,
                    args.task,
                    codebase_analysis,
                    coderabbit_analysis,
                    relevant_files,
                    model=model,
                )
            elif provider == "anthropic":
                patch = generate_patch_anthropic(
                    system_prompt,
                    args.task,
                    codebase_analysis,
                    coderabbit_analysis,
                    relevant_files,
                    model=model,
                )
            else:
                raise ValueError(f"Unknown provider: {provider}")
            
            # Extract diff from response
            patch = extract_diff_from_response(patch)
            
            # Validate format
            is_valid, validation_errors = validate_diff_format(patch)
            if not is_valid:
                print(f"[pj] Warning: Generated patch validation failed:", file=sys.stderr)
                for error in validation_errors:
                    print(f"[pj]   - {error}", file=sys.stderr)
                
                # Check if patch is incomplete (missing lines)
                incomplete_errors = [e for e in validation_errors if "Expected" in e and "but found" in e]
                if incomplete_errors:
                    print(f"[pj] ERROR: Patch appears to be incomplete. The LLM did not generate the full patch.", file=sys.stderr)
                    print(f"[pj] This usually means the response was cut off or the LLM stopped generating early.", file=sys.stderr)
                    print(f"[pj] Consider increasing max_tokens or simplifying the task.", file=sys.stderr)
                
                print(f"[pj] Patch will still be written, but git apply may fail", file=sys.stderr)
            # Still write it out, let git apply handle validation
            else:
                print(f"[pj] Patch format validation passed", file=sys.stderr)
            
            # Clean the patch one more time before writing (remove any remaining artifacts)
            patch_lines = patch.split('\n')
            clean_patch_lines = []
            for line in patch_lines:
                # Stop at shell artifacts or error messages
                if any(artifact in line for artifact in ['dump_bash_state', 'command not found', 'Error:', 'Traceback', '--:']):
                    break
                clean_patch_lines.append(line)
            patch = '\n'.join(clean_patch_lines).strip()
            if patch and not patch.endswith('\n'):
                patch += '\n'
        
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

