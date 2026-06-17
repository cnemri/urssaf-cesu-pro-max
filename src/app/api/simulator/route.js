import { NextResponse } from 'next/server';
import { calculateForward, calculateInverse } from '../../utils/urssafCalculator';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse common parameters
    const nbHrStr = searchParams.get('nbHr');
    const nbHr = nbHrStr ? parseFloat(nbHrStr) : 50;
    
    if (isNaN(nbHr) || nbHr <= 0) {
      return NextResponse.json(
        { error: "Invalid hours worked (nbHr must be a positive number)" },
        { status: 400 }
      );
    }
    
    // Determine action: either explicit or inferred
    let action = searchParams.get('action');
    const salHrStr = searchParams.get('salHr');
    const targetCostStr = searchParams.get('targetCost');
    const targetHourlyCostStr = searchParams.get('targetHourlyCost');
    
    if (!action) {
      if (targetCostStr !== null || targetHourlyCostStr !== null) {
        action = 'inverse';
      } else {
        action = 'forward';
      }
    }
    
    if (action === 'forward') {
      const salHr = salHrStr ? parseFloat(salHrStr) : 15.00;
      if (isNaN(salHr) || salHr < 10.82) {
        return NextResponse.json(
          { error: "Invalid hourly net wage (salHr must be a number >= 10.82)" },
          { status: 400 }
        );
      }
      
      const creditDimpot = searchParams.get('creditDimpot') !== 'false';
      const result = calculateForward(salHr, nbHr, creditDimpot);
      return NextResponse.json({
        success: true,
        action: 'forward',
        ...result
      });
      
    } else if (action === 'inverse') {
      let targetCost = 0;
      let targetHourlyCost = 0;
      
      if (targetHourlyCostStr !== null) {
        targetHourlyCost = parseFloat(targetHourlyCostStr);
        if (isNaN(targetHourlyCost) || targetHourlyCost <= 0) {
          return NextResponse.json(
            { error: "Invalid target hourly cost (targetHourlyCost must be a positive number)" },
            { status: 400 }
          );
        }
        targetCost = targetHourlyCost * nbHr;
      } else if (targetCostStr !== null) {
        targetCost = parseFloat(targetCostStr);
        if (isNaN(targetCost) || targetCost <= 0) {
          return NextResponse.json(
            { error: "Invalid target monthly cost (targetCost must be a positive number)" },
            { status: 400 }
          );
        }
        targetHourlyCost = targetCost / nbHr;
      } else {
        return NextResponse.json(
          { error: "Missing parameter 'targetCost' or 'targetHourlyCost' for inverse action" },
          { status: 400 }
        );
      }
      
      const creditDimpot = searchParams.get('creditDimpot') !== 'false';
      const solvedSalHr = calculateInverse(targetCost, nbHr, creditDimpot);
      
      // Also return the full breakdown corresponding to this solved hourly wage
      const breakdown = calculateForward(solvedSalHr, nbHr, creditDimpot);
      
      return NextResponse.json({
        success: true,
        action: 'inverse',
        solvedSalHr,
        inputs: {
          targetCost: targetHourlyCostStr !== null ? undefined : targetCost,
          targetHourlyCost: targetHourlyCostStr !== null ? targetHourlyCost : undefined,
          nbHr,
          creditDimpot
        },
        ...breakdown
      });
      
    } else {
      return NextResponse.json(
        { error: "Unknown action. Must be 'forward' or 'inverse'." },
        { status: 400 }
      );
    }
    
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    
    const nbHr = body.nbHr !== undefined ? parseFloat(body.nbHr) : 50;
    if (isNaN(nbHr) || nbHr <= 0) {
      return NextResponse.json(
        { error: "Invalid hours worked (nbHr must be a positive number)" },
        { status: 400 }
      );
    }
    
    let action = body.action;
    if (!action) {
      if (body.targetCost !== undefined || body.targetHourlyCost !== undefined) {
        action = 'inverse';
      } else {
        action = 'forward';
      }
    }
    
    if (action === 'forward') {
      const salHr = body.salHr !== undefined ? parseFloat(body.salHr) : 15.00;
      if (isNaN(salHr) || salHr < 10.82) {
        return NextResponse.json(
          { error: "Invalid hourly net wage (salHr must be a number >= 10.82)" },
          { status: 400 }
        );
      }
      
      const creditDimpot = body.creditDimpot !== false;
      const result = calculateForward(salHr, nbHr, creditDimpot);
      return NextResponse.json({
        success: true,
        action: 'forward',
        ...result
      });
      
    } else if (action === 'inverse') {
      let targetCost = 0;
      let targetHourlyCost = 0;
      
      if (body.targetHourlyCost !== undefined) {
        targetHourlyCost = parseFloat(body.targetHourlyCost);
        if (isNaN(targetHourlyCost) || targetHourlyCost <= 0) {
          return NextResponse.json(
            { error: "Invalid target hourly cost (targetHourlyCost must be a positive number)" },
            { status: 400 }
          );
        }
        targetCost = targetHourlyCost * nbHr;
      } else if (body.targetCost !== undefined) {
        targetCost = parseFloat(body.targetCost);
        if (isNaN(targetCost) || targetCost <= 0) {
          return NextResponse.json(
            { error: "Invalid target monthly cost (targetCost must be a positive number)" },
            { status: 400 }
          );
        }
        targetHourlyCost = targetCost / nbHr;
      } else {
        return NextResponse.json(
          { error: "Missing field 'targetCost' or 'targetHourlyCost' for inverse action" },
          { status: 400 }
        );
      }
      
      const creditDimpot = body.creditDimpot !== false;
      const solvedSalHr = calculateInverse(targetCost, nbHr, creditDimpot);
      const breakdown = calculateForward(solvedSalHr, nbHr, creditDimpot);
      
      return NextResponse.json({
        success: true,
        action: 'inverse',
        solvedSalHr,
        inputs: {
          targetCost: body.targetHourlyCost !== undefined ? undefined : targetCost,
          targetHourlyCost: body.targetHourlyCost !== undefined ? targetHourlyCost : undefined,
          nbHr,
          creditDimpot
        },
        ...breakdown
      });
      
    } else {
      return NextResponse.json(
        { error: "Unknown action. Must be 'forward' or 'inverse'." },
        { status: 400 }
      );
    }
    
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error: " + error.message },
      { status: 500 }
    );
  }
}
