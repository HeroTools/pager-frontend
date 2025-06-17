#!/bin/bash

# Script to convert NextJS project files and folders from PascalCase/camelCase to kebab-case
# Usage: ./rename-to-kebab-case.sh [directory]

# Set the target directory (default to current directory)
TARGET_DIR="${1:-.}"

# Function to convert PascalCase/camelCase to kebab-case
to_kebab_case() {
    echo "$1" | sed -E 's/([a-z0-9])([A-Z])/\1-\2/g' | tr '[:upper:]' '[:lower:]'
}

# Function to rename files and update imports
rename_files_and_folders() {
    local dir="$1"
    
    # First pass: collect all files that need renaming
    declare -A rename_map
    
    # Find all files and directories, process deepest first (reverse order)
    find "$dir" -depth -type f -o -type d | while IFS= read -r item; do
        # Skip hidden files, node_modules, .git, and .next directories
        if [[ "$item" == *"/.git"* ]] || [[ "$item" == *"/node_modules"* ]] || [[ "$item" == *"/.next"* ]] || [[ "$(basename "$item")" == .* ]]; then
            continue
        fi
        
        # Get the directory and filename
        dir_path="$(dirname "$item")"
        filename="$(basename "$item")"
        
        # Convert filename to kebab-case
        new_filename="$(to_kebab_case "$filename")"
        
        # If the name changed, rename it
        if [[ "$filename" != "$new_filename" ]]; then
            new_path="$dir_path/$new_filename"
            
            echo "Renaming: $item -> $new_path"
            
            # Check if target already exists
            if [[ -e "$new_path" ]]; then
                echo "Warning: $new_path already exists, skipping..."
                continue
            fi
            
            # Rename the file/directory
            mv "$item" "$new_path"
            
            # Store the mapping for import updates
            echo "$item|$new_path" >> /tmp/rename_mappings.txt
        fi
    done
}

# Function to update import statements in files
update_imports() {
    local dir="$1"
    
    if [[ ! -f /tmp/rename_mappings.txt ]]; then
        echo "No renames to process for imports"
        return
    fi
    
    echo "Updating import statements..."
    
    # Find all TypeScript, JavaScript, and CSS files
    find "$dir" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" -o -name "*.scss" -o -name "*.sass" \) | while IFS= read -r file; do
        # Skip node_modules and .git
        if [[ "$file" == *"/node_modules/"* ]] || [[ "$file" == *"/.git/"* ]] || [[ "$file" == *"/.next/"* ]]; then
            continue
        fi
        
        # Read rename mappings and update imports
        while IFS='|' read -r old_path new_path; do
            if [[ -z "$old_path" ]] || [[ -z "$new_path" ]]; then
                continue
            fi
            
            # Get relative paths for import statements
            old_basename="$(basename "$old_path" | sed 's/\.[^.]*$//')"  # Remove extension
            new_basename="$(basename "$new_path" | sed 's/\.[^.]*$//')"  # Remove extension
            
            # Update import statements (various patterns)
            sed -i.bak \
                -e "s|from ['\"]\\([^'\"]*\\)/$old_basename['\"]|from '\\1/$new_basename'|g" \
                -e "s|from ['\"]\\([^'\"]*\\)\\/$old_basename\\.[jt]sx\\?['\"]|from '\\1/$new_basename'|g" \
                -e "s|import ['\"]\\([^'\"]*\\)/$old_basename['\"]|import '\\1/$new_basename'|g" \
                -e "s|import ['\"]\\([^'\"]*\\)\\/$old_basename\\.[jt]sx\\?['\"]|import '\\1/$new_basename'|g" \
                -e "s|\\.\\/\\([^'\"]*\\)\\/$old_basename|.\/\\1\/$new_basename|g" \
                -e "s|\\.\\.\\/\\([^'\"]*\\)\\/$old_basename|..\/\\1\/$new_basename|g" \
                "$file"
                
            # Remove backup file if sed succeeded
            [[ -f "$file.bak" ]] && rm "$file.bak"
            
        done < /tmp/rename_mappings.txt
    done
    
    # Clean up temporary file
    rm -f /tmp/rename_mappings.txt
}

# Main execution
echo "Starting NextJS project rename to kebab-case..."
echo "Target directory: $TARGET_DIR"
echo ""

# Confirm before proceeding
read -p "This will rename files and folders in your project. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 1
fi

# Create backup recommendation
echo "RECOMMENDATION: Create a git commit or backup before running this script!"
read -p "Have you backed up your project? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please backup your project first, then run this script again."
    exit 1
fi

# Clean up any previous temp files
rm -f /tmp/rename_mappings.txt

# Step 1: Rename files and folders
echo "Step 1: Renaming files and folders..."
rename_files_and_folders "$TARGET_DIR"

# Step 2: Update import statements
echo "Step 2: Updating import statements..."
update_imports "$TARGET_DIR"

echo ""
echo "Conversion complete!"
echo "Please review the changes and test your application."
echo "You may need to manually update some complex import patterns."