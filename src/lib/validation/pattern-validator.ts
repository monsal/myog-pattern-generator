import type { GeneratedPattern } from '../../types/pattern';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validatePattern(pattern: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Check required top-level fields
  if (!pattern.id) {
    errors.push({ field: 'id', message: 'Pattern ID is required' });
  }

  if (!pattern.projectInfo) {
    errors.push({ field: 'projectInfo', message: 'Project info is required' });
  } else {
    if (!pattern.projectInfo.name) {
      errors.push({ field: 'projectInfo.name', message: 'Project name is required' });
    }
    if (!['beginner', 'intermediate', 'advanced'].includes(pattern.projectInfo.difficulty)) {
      errors.push({ field: 'projectInfo.difficulty', message: 'Invalid difficulty level' });
    }
  }

  // Validate pieces
  if (!Array.isArray(pattern.pieces) || pattern.pieces.length === 0) {
    errors.push({ field: 'pieces', message: 'At least one pattern piece is required' });
  } else {
    const pieceIds = new Set<string>();
    pattern.pieces.forEach((piece: any, index: number) => {
      const prefix = `pieces[${index}]`;

      if (!piece.id) {
        errors.push({ field: `${prefix}.id`, message: 'Piece ID is required' });
      } else {
        if (pieceIds.has(piece.id)) {
          errors.push({ field: `${prefix}.id`, message: `Duplicate piece ID: ${piece.id}` });
        }
        pieceIds.add(piece.id);
      }

      if (!piece.name) {
        errors.push({ field: `${prefix}.name`, message: 'Piece name is required' });
      }

      if (typeof piece.cutQuantity !== 'number' || piece.cutQuantity < 1) {
        errors.push({ field: `${prefix}.cutQuantity`, message: 'Cut quantity must be a positive integer' });
      }

      if (!['rectangle', 'circle', 'polygon', 'custom'].includes(piece.shape)) {
        errors.push({ field: `${prefix}.shape`, message: 'Invalid shape type' });
      }

      if (!piece.dimensions) {
        errors.push({ field: `${prefix}.dimensions`, message: 'Dimensions are required' });
      } else {
        if (piece.shape === 'rectangle') {
          if (typeof piece.dimensions.width !== 'number' || piece.dimensions.width <= 0) {
            errors.push({ field: `${prefix}.dimensions.width`, message: 'Width must be a positive number' });
          }
          if (typeof piece.dimensions.height !== 'number' || piece.dimensions.height <= 0) {
            errors.push({ field: `${prefix}.dimensions.height`, message: 'Height must be a positive number' });
          }
          // Sanity check: pieces shouldn't be absurdly large
          if (piece.dimensions.width > 500 || piece.dimensions.height > 500) {
            errors.push({ field: `${prefix}.dimensions`, message: 'Dimensions seem unreasonably large (>500cm)' });
          }
        } else if (piece.shape === 'circle') {
          if (typeof piece.dimensions.radius !== 'number' || piece.dimensions.radius <= 0) {
            errors.push({ field: `${prefix}.dimensions.radius`, message: 'Radius must be a positive number' });
          }
          if (piece.dimensions.radius > 250) {
            errors.push({ field: `${prefix}.dimensions.radius`, message: 'Radius seems unreasonably large (>250cm)' });
          }
        }
      }

      if (typeof piece.seamAllowance !== 'number' || piece.seamAllowance < 0.5 || piece.seamAllowance > 5) {
        errors.push({ field: `${prefix}.seamAllowance`, message: 'Seam allowance must be between 0.5cm and 5cm' });
      }
    });
  }

  // Validate materials
  if (!pattern.materials) {
    errors.push({ field: 'materials', message: 'Materials list is required' });
  } else {
    if (!Array.isArray(pattern.materials.fabric) || pattern.materials.fabric.length === 0) {
      errors.push({ field: 'materials.fabric', message: 'At least one fabric specification is required' });
    } else {
      pattern.materials.fabric.forEach((fabric: any, index: number) => {
        if (!fabric.type) {
          errors.push({ field: `materials.fabric[${index}].type`, message: 'Fabric type is required' });
        }
        if (typeof fabric.amount !== 'number' || fabric.amount <= 0) {
          errors.push({ field: `materials.fabric[${index}].amount`, message: 'Fabric amount must be positive' });
        }
      });
    }

    if (!pattern.materials.thread) {
      errors.push({ field: 'materials.thread', message: 'Thread specification is required' });
    }
  }

  // Validate hardware
  if (!Array.isArray(pattern.hardware)) {
    errors.push({ field: 'hardware', message: 'Hardware list must be an array' });
  }

  // Validate assembly instructions
  if (!Array.isArray(pattern.assembly) || pattern.assembly.length === 0) {
    errors.push({ field: 'assembly', message: 'Assembly instructions are required' });
  } else {
    pattern.assembly.forEach((step: any, index: number) => {
      if (step.step !== index + 1) {
        errors.push({ field: `assembly[${index}].step`, message: 'Assembly steps must be sequential' });
      }
      if (!step.instruction) {
        errors.push({ field: `assembly[${index}].instruction`, message: 'Instruction text is required' });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
