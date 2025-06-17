#!/bin/bash

# Script to convert NextJS project files and folders from PascalCase/camelCase to kebab-case
# and update all import statements accordingly
# Usage: ./rename-to-kebab-case.sh [directory]

# Set the target directory (default to current directory)
TARGET_DIR="${1:-.}"

# Function to convert PascalCase/camelCase to kebab-case
to_kebab_case() {
    echo "$1" | sed -E 's/([a-z0-9])([A-Z])/\1-\2/g' | tr '[:upper:]' '[:lower:]'
}

# Function to get relative path between two files
get_relative_path() {
    local from="$1"
    local to="$2"
    local from_dir=$(dirname "$from")
    local to_dir=$(dirname "$to")
    
    # Use realpath to get relative path if available
    if command -v realpath >/dev/null 2>&1; then
        realpath --relative-to="$from_dir" "$to" 2>/dev/null || echo "$to"
    else
        echo "$to"
    fi
}

# Function to build comprehensive rename mapping
build_rename_mapping() {
    local dir="$1"
    local mapping_file="/tmp/rename_mappings.txt"
    
    echo "Building rename mapping..."
    rm -f "$mapping_file"
    
    # Find all files and directories that need renaming
    find "$dir" -type f -o -type d | sort | while IFS= read -r item; do
        # Skip hidden files, node_modules, .git, and .next directories
        if [[ "$item" == *"/.git"* ]] || [[ "$item" == *"/node_modules"* ]] || [[ "$item" == *"/.next"* ]] || [[ "$(basename "$item")" == .* ]]; then
            continue
        fi
        
        dir_path="$(dirname "$item")"
        filename="$(basename "$item")"
        new_filename="$(to_kebab_case "$filename")"
        
        if [[ "$filename" != "$new_filename" ]]; then
            new_path="$dir_path/$new_filename"
            
            # Store both file and directory mappings
            echo "$item|$new_path" >> "$mapping_file"
            
            # For files, also store the import name mapping (without extension)
            if [[ -f "$item" ]]; then
                old_import_name="${filename%.*}"
                new_import_name="${new_filename%.*}"
                if [[ "$old_import_name" != "$new_import_name" ]]; then
                    echo "IMPORT:$old_import_name|$new_import_name" >> "$mapping_file"
                fi
            fi
        fi
    done
}

# Function to rename files and folders
rename_files_and_folders() {
    local dir="$1"
    local mapping_file="/tmp/rename_mappings.txt"
    
    echo "Renaming files and folders..."
    
    # Process renames in reverse order (deepest first)
    grep -v "^IMPORT:" "$mapping_file" | tac | while IFS='|' read -r old_path new_path; do
        if [[ -z "$old_path" ]] || [[ -z "$new_path" ]]; then
            continue
        fi
        
        echo "Renaming: $old_path -> $new_path"
        
        # Check if target already exists
        if [[ -e "$new_path" ]]; then
            echo "Warning: $new_path already exists, skipping..."
            continue
        fi
        
        # Rename the file/directory
        mv "$old_path" "$new_path" 2>/dev/null || echo "Failed to rename $old_path"
    done
}

# Function to update all imports comprehensively
update_all_imports() {
    local dir="$1"
    local mapping_file="/tmp/rename_mappings.txt"
    
    if [[ ! -f "$mapping_file" ]]; then
        echo "No rename mappings found"
        return
    fi
    
    echo "Updating import statements in all files..."
    
    # Find all relevant files for import updates
    find "$dir" -type f \( \
        -name "*.ts" -o -name "*.tsx" -o \
        -name "*.js" -o -name "*.jsx" -o \
        -name "*.vue" -o -name "*.svelte" -o \
        -name "*.css" -o -name "*.scss" -o -name "*.sass" -o \
        -name "*.json" -o -name "*.md" -o -name "*.mdx" \
    \) | while IFS= read -r file; do
        
        # Skip node_modules, .git, .next
        if [[ "$file" == *"/node_modules/"* ]] || [[ "$file" == *"/.git/"* ]] || [[ "$file" == *"/.next/"* ]]; then
            continue
        fi
        
        echo "Processing: $file"
        
        # Create a backup
        cp "$file" "$file.backup"
        
        # Process each rename mapping
        while IFS='|' read -r old_item new_item; do
            if [[ -z "$old_item" ]] || [[ -z "$new_item" ]]; then
                continue
            fi
            
            # Skip IMPORT: entries for this pass
            if [[ "$old_item" == IMPORT:* ]]; then
                continue
            fi
            
            # Get the file/folder names without paths
            old_basename="$(basename "$old_item")"
            new_basename="$(basename "$new_item")"
            
            # Remove file extension for import name
            old_import_name="${old_basename%.*}"
            new_import_name="${new_basename%.*}"
            
            # Skip if names are the same
            if [[ "$old_import_name" == "$new_import_name" ]]; then
                continue
            fi
            
            # Update various import patterns
            sed -i \
                -e "s|from ['\"]\\([^'\"]*\\)/${old_import_name}['\"]|from '\\1/${new_import_name}'|g" \
                -e "s|from ['\"]\\([^'\"]*\\)/${old_import_name}\\.[jt]sx\\?['\"]|from '\\1/${new_import_name}'|g" \
                -e "s|from ['\"]\\([^'\"]*\\)/${old_import_name}\\.vue['\"]|from '\\1/${new_import_name}.vue'|g" \
                -e "s|import ['\"]\\([^'\"]*\\)/${old_import_name}['\"]|import '\\1/${new_import_name}'|g" \
                -e "s|import ['\"]\\([^'\"]*\\)/${old_import_name}\\.[jt]sx\\?['\"]|import '\\1/${new_import_name}'|g" \
                -e "s|import ['\"]\\([^'\"]*\\)/${old_import_name}\\.vue['\"]|import '\\1/${new_import_name}.vue'|g" \
                -e "s|require(['\"]\\([^'\"]*\\)/${old_import_name}['\"])|require('\\1/${new_import_name}')|g" \
                -e "s|require(['\"]\\([^'\"]*\\)/${old_import_name}\\.[jt]sx\\?['\"])|require('\\1/${new_import_name}')|g" \
                -e "s|import(\\(['\"]\\([^'\"]*\\)/${old_import_name}['\"]\\))|import('\\2/${new_import_name}')|g" \
                -e "s|import(\\(['\"]\\([^'\"]*\\)/${old_import_name}\\.[jt]sx\\?['\"]\\))|import('\\2/${new_import_name}')|g" \
                -e "s|\\./${old_import_name}|./${new_import_name}|g" \
                -e "s|\\.\\./${old_import_name}|../${new_import_name}|g" \
                -e "s|@/${old_import_name}|@/${new_import_name}|g" \
                -e "s|~/${old_import_name}|~/${new_import_name}|g" \
                -e "s|/${old_import_name}/|/${new_import_name}/|g" \
                "$file"
            
            # Update CSS @import statements
            sed -i \
                -e "s|@import ['\"]\\([^'\"]*\\)/${old_import_name}['\"]|@import '\\1/${new_import_name}'|g" \
                -e "s|@import ['\"]\\([^'\"]*\\)/${old_import_name}\\.css['\"]|@import '\\1/${new_import_name}.css'|g" \
                "$file"
            
            # Update Next.js dynamic imports and page routes
            sed -i \
                -e "s|'/${old_import_name}'|'/${new_import_name}'|g" \
                -e "s|\"/${old_import_name}\"|\"/${new_import_name}\"|g" \
                -e "s|pages/${old_import_name}|pages/${new_import_name}|g" \
                -e "s|/pages/${old_import_name}|/pages/${new_import_name}|g" \
                "$file"
            
        done < "$mapping_file"
        
        # Process IMPORT: mappings (component/function name changes)
        grep "^IMPORT:" "$mapping_file" | while IFS='|' read -r import_mapping new_name; do
            old_name="${import_mapping#IMPORT:}"
            if [[ -z "$old_name" ]] || [[ -z "$new_name" ]] || [[ "$old_name" == "$new_name" ]]; then
                continue
            fi
            
            # Update component names in JSX/TSX files
            if [[ "$file" == *.tsx ]] || [[ "$file" == *.jsx ]]; then
                sed -i \
                    -e "s|<${old_name}\\b|<${new_name}|g" \
                    -e "s|</${old_name}>|</${new_name}>|g" \
                    -e "s|import ${old_name}\\b|import ${new_name}|g" \
                    -e "s|import { ${old_name}\\b|import { ${new_name}|g" \
                    -e "s|, ${old_name}\\b|, ${new_name}|g" \
                    -e "s|export { ${old_name}\\b|export { ${new_name}|g" \
                    -e "s|const ${old_name}\\b|const ${new_name}|g" \
                    -e "s|function ${old_name}\\b|function ${new_name}|g" \
                    "$file"
            fi
        done
        
        # Check if file actually changed
        if ! diff -q "$file" "$file.backup" >/dev/null 2>&1; then
            echo "  ✓ Updated imports in $(basename "$file")"
        fi
        
        # Remove backup
        rm "$file.backup"
    done
}

# Function to update package.json and other config files
update_config_files() {
    local dir="$1"
    local mapping_file="/tmp/rename_mappings.txt"
    
    echo "Updating configuration files..."
    
    # Find config files
    find "$dir" -maxdepth 2 -type f \( \
        -name "package.json" -o -name "tsconfig.json" -o -name "next.config.*" -o \
        -name "tailwind.config.*" -o -name "webpack.config.*" -o \
        -name "jest.config.*" -o -name ".eslintrc.*" \
    \) | while IFS= read -r config_file; do
        
        if [[ "$config_file" == *"/node_modules/"* ]]; then
            continue
        fi
        
        echo "Checking config file: $config_file"
        cp "$config_file" "$config_file.backup"
        
        # Update file references in config files
        while IFS='|' read -r old_item new_item; do
            if [[ -z "$old_item" ]] || [[ -z "$new_item" ]] || [[ "$old_item" == IMPORT:* ]]; then
                continue
            fi
            
            old_basename="$(basename "$old_item")"
            new_basename="$(basename "$new_item")"
            
            # Update references in JSON and JS config files
            sed -i \
                -e "s|\"${old_basename}\"|\"${new_basename}\"|g" \
                -e "s|'${old_basename}'|'${new_basename}'|g" \
                -e "s|/${old_basename}/|/${new_basename}/|g" \
                "$config_file"
            
        done < "$mapping_file"
        
        # Remove backup if no changes
        if diff -q "$config_file" "$config_file.backup" >/dev/null 2>&1; then
            rm "$config_file.backup"
        else
            echo "  ✓ Updated $config_file"
            rm "$config_file.backup"
        fi
    done
}

# Main execution
echo "🚀 Starting NextJS project rename to kebab-case..."
echo "Target directory: $TARGET_DIR"
echo ""

# Confirm before proceeding
read -p "This will rename files/folders and update imports in your project. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 1
fi

# Create backup recommendation
echo "⚠️  IMPORTANT: This script will modify many files!"
echo "   Recommended: Create a git commit or backup before running this script!"
read -p "Have you backed up your project? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please backup your project first, then run this script again."
    exit 1
fi

# Clean up any previous temp files
rm -f /tmp/rename_mappings.txt

# Step 1: Build comprehensive rename mapping
echo "📋 Step 1: Analyzing files and building rename mapping..."
build_rename_mapping "$TARGET_DIR"

if [[ ! -f /tmp/rename_mappings.txt ]] || [[ ! -s /tmp/rename_mappings.txt ]]; then
    echo "No files need renaming. Your project already uses kebab-case!"
    exit 0
fi

echo "Files to be renamed:"
grep -v "^IMPORT:" /tmp/rename_mappings.txt | head -10
echo ""

# Step 2: Rename files and folders
echo "📝 Step 2: Renaming files and folders..."
rename_files_and_folders "$TARGET_DIR"

# Step 3: Update all imports
echo "🔄 Step 3: Updating import statements..."
update_all_imports "$TARGET_DIR"

# Step 4: Update config files
echo "⚙️  Step 4: Updating configuration files..."
update_config_files "$TARGET_DIR"

# Clean up
rm -f /tmp/rename_mappings.txt

echo ""
echo "✅ Conversion complete!"
echo ""
echo "📝 Next steps:"
echo "1. Test your application: npm run dev"
echo "2. Check for any missed imports or references"
echo "3. Update any hardcoded file paths in your code"
echo "4. Check dynamic imports and string-based file references"
echo "5. Commit your changes if everything works!"
echo ""
echo "💡 If you find issues, you can revert using: git checkout ."