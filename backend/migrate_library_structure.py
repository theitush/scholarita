#!/usr/bin/env python3
"""
Migration script to move papers from old structure to new structure.

Old structure:
library/papers/
├── paper1.json
├── paper1.pdf
├── paper2.json
└── paper2.pdf

New structure:
library/papers/
├── metadata/
│   ├── paper1.json
│   └── paper2.json
├── pdfs/
│   ├── paper1.pdf
│   └── paper2.pdf
└── text/
    ├── paper1.txt
    └── paper2.txt
"""

import sys
from pathlib import Path
from config import get_library_path
from storage import extract_text_from_pdf, save_extracted_text

def migrate_library():
    """Migrate library from old flat structure to new organized structure."""
    library_path = get_library_path()

    # Create new directories
    metadata_dir = library_path / "metadata"
    pdfs_dir = library_path / "pdfs"
    text_dir = library_path / "text"

    metadata_dir.mkdir(parents=True, exist_ok=True)
    pdfs_dir.mkdir(parents=True, exist_ok=True)
    text_dir.mkdir(parents=True, exist_ok=True)

    print(f"Migrating library at: {library_path}")
    print("=" * 60)

    # Find all JSON files in the root of library_path
    json_files = list(library_path.glob("*.json"))

    if not json_files:
        print("No papers found to migrate (or already migrated).")
        return

    print(f"Found {len(json_files)} papers to migrate\n")

    migrated_count = 0
    extracted_count = 0

    for json_file in json_files:
        paper_id = json_file.stem
        pdf_file = library_path / f"{paper_id}.pdf"

        print(f"Migrating: {paper_id}")

        # Move JSON to metadata/
        new_json_path = metadata_dir / json_file.name
        if not new_json_path.exists():
            json_file.rename(new_json_path)
            print(f"  ✓ Moved JSON to metadata/")
        else:
            print(f"  ⚠ JSON already exists in metadata/, skipping")

        # Move PDF to pdfs/
        if pdf_file.exists():
            new_pdf_path = pdfs_dir / pdf_file.name
            if not new_pdf_path.exists():
                pdf_file.rename(new_pdf_path)
                print(f"  ✓ Moved PDF to pdfs/")

                # Extract text
                try:
                    extracted_text = extract_text_from_pdf(paper_id)
                    if extracted_text:
                        save_extracted_text(paper_id, extracted_text)
                        print(f"  ✓ Extracted text ({len(extracted_text)} chars)")
                        extracted_count += 1
                    else:
                        print(f"  ⚠ Could not extract text from PDF")
                except Exception as e:
                    print(f"  ⚠ Error extracting text: {e}")
            else:
                print(f"  ⚠ PDF already exists in pdfs/, skipping")
        else:
            print(f"  ⚠ No PDF found for {paper_id}")

        migrated_count += 1
        print()

    print("=" * 60)
    print(f"Migration complete!")
    print(f"Papers migrated: {migrated_count}")
    print(f"Texts extracted: {extracted_count}")

if __name__ == "__main__":
    try:
        migrate_library()
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)
