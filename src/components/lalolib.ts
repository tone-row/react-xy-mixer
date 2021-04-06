// @ts-nocheck

const EPS = 2.2205e-16;

function type(X) {
  if (X == null) return "undefined";
  else if (X.type) return X.type;
  else {
    var t = typeof X;
    if (t == "object") {
      if (Array.isArray(X)) {
        if (isArrayOfNumbers(X)) return "vector";
        // for array vectors created by hand
        else return "Array";
      } else if (X.buffer) return "vector";
      // Float64Array vector
      else return t;
    } else return t;
  }
}

function isArrayOfNumbers(A) {
  for (var i = 0; i < A.length; i++) if (typeof A[i] != "number") return false;
  return true;
}

function mat(elems, rowwise) {
  var k;
  var concatWithNumbers = false;
  var elemtypes = new Array(elems.length);
  for (k = 0; k < elems.length; k++) {
    elemtypes[k] = type(elems[k]);
    if (elemtypes[k] == "number") concatWithNumbers = true;
  }

  if (typeof rowwise == "undefined") {
    // check if vector of numbers
    if (type(elems) == "vector") return new Float64Array(elems);

    // check if 2D Array => toMatrix rowwise
    var rowwise = true;
    for (k = 0; k < elems.length; k++) {
      if (!Array.isArray(elems[k]) || elemtypes[k] == "vector") {
        rowwise = false;
        if (elemtypes[k] == "string") return elems; // received vector of strings => return it directly
      }
    }
  }

  if (elems.length == 0) {
    return [];
  }

  var m = 0;
  var n = 0;
  var i;
  var j;
  if (rowwise) {
    var res = [];

    for (k = 0; k < elems.length; k++) {
      switch (elemtypes[k]) {
        case "matrix":
          res.push(elems[k].val);
          m += elems[k].m;
          n = elems[k].n;
          break;

        case "vector":
          if (concatWithNumbers) {
            // return a column by concatenating vectors and numbers
            for (var l = 0; l < elems[k].length; l++) res.push(elems[k][l]);
            n = 1;
            m += elems[k].length;
          } else {
            // vector (auto transposed) as row in a matrix
            res.push(elems[k]);
            m += 1;
            n = elems[k].length;
          }
          break;

        case "number":
          res.push(elems[k]);
          m += 1;
          n = 1;
          break;

        case "spvector":
          return spmat(elems);

        default:
          // Array containing not only numbers...
          // probably calling mat( Array2D ) => return Array2D
          return elems;
          break;
      }
    }
    if (n == 1) {
      var M = new Float64Array(res);
      return M;
    }
    var M = new Matrix(m, n);
    var p = 0;
    for (k = 0; k < res.length; k++) {
      if (res[k].buffer) {
        M.val.set(res[k], p);
        p += res[k].length;
      } else {
        for (j = 0; j < res[k].length; j++) M.val[p + j] = res[k][j];
        p += res[k].length;
      }
    }
    return M;
  } else {
    // compute size
    m = size(elems[0], 1);
    for (k = 0; k < elems.length; k++) {
      if (elemtypes[k] == "matrix") n += elems[k].n;
      else n++;
      if (size(elems[k], 1) != m) return "undefined";
    }

    // Build matrix
    var res = new Matrix(m, n);
    var c;
    for (i = 0; i < m; i++) {
      c = 0; // col index
      for (k = 0; k < elems.length; k++) {
        switch (elemtypes[k]) {
          case "matrix":
            for (j = 0; j < elems[k].n; j++) {
              res.val[i * n + j + c] = elems[k].val[i * elems[k].n + j];
            }
            c += elems[k].n;
            break;

          case "vector": //vector
            res.val[i * n + c] = elems[k][i];
            c++;
            break;

          case "number":
            res.val[i * n + c] = elems[k];
            c++;
            break;
          default:
            break;
        }
      }
    }

    return res;
  }
}

export function array2mat(A) {
  return mat(A, true);
}

export function solve(A, b) {
  /* Solve the linear system Ax = b	*/

  var tA = type(A);

  if (tA == "vector" || tA == "spvector" || (tA == "matrix" && A.m == 1)) {
    // One-dimensional least squares problem:
    var AtA = mul(transpose(A), A);
    var Atb = mul(transpose(A), b);
    return Atb / AtA;
  }

  if (tA == "spmatrix") {
    /*if ( A.m == A.n )
			return spsolvecg(A, b); // assume A is positive definite
		else*/
    return spcgnr(A, b);
  }

  if (type(b) == "vector") {
    if (A.m == A.n) return solveGaussianElimination(A, b);
    else return solveWithQRcolumnpivoting(A, b);
  } else return solveWithQRcolumnpivotingMultipleRHS(A, b); // b is a matrix
}

function mul(a, b) {
  var sa = size(a);
  var sb = size(b);
  if (!isScalar(a) && sa[0] == 1 && sa[1] == 1) a = get(a, 0, 0);
  if (!isScalar(b) && sb[0] == 1 && sb[1] == 1) b = get(b, 0, 0);

  switch (type(a)) {
    case "number":
      switch (type(b)) {
        case "number":
          return a * b;
          break;
        case "Complex":
          return mulComplexReal(b, a);
          break;
        case "vector":
          return mulScalarVector(a, b);
          break;
        case "spvector":
          return mulScalarspVector(a, b);
          break;
        case "ComplexVector":
          return mulScalarComplexVector(a, b);
          break;
        case "matrix":
          return mulScalarMatrix(a, b);
          break;
        case "spmatrix":
          return mulScalarspMatrix(a, b);
          break;
        case "ComplexMatrix":
          return mulScalarComplexMatrix(a, b);
          break;
        default:
          return undefined;
          break;
      }
      break;
    case "Complex":
      switch (type(b)) {
        case "number":
          return mulComplexReal(a, b);
          break;
        case "Complex":
          return mulComplex(a, b);
          break;
        case "vector":
          return mulComplexVector(a, b);
          break;
        case "ComplexVector":
          return mulComplexComplexVector(a, b);
          break;
        case "spvector":
          return mulComplexspVector(a, b);
          break;
        case "matrix":
          return mulComplexMatrix(a, b);
          break;
        case "ComplexMatrix":
          return mulComplexComplexMatrix(a, b);
          break;
        case "spmatrix":
          return mulComplexspMatrix(a, b);
          break;
        default:
          return undefined;
          break;
      }
      break;
    case "vector":
      switch (type(b)) {
        case "number":
          return mulScalarVector(b, a);
          break;
        case "Complex":
          return mulComplexVector(b, a);
          break;
        case "vector":
          if (a.length != b.length) {
            error(
              "Error in mul(a,b) (dot product): a.length = " +
                a.length +
                " != " +
                b.length +
                " = b.length."
            );
            return undefined;
          }
          return dot(a, b);
          break;
        case "spvector":
          if (a.length != b.length) {
            error(
              "Error in mul(a,b) (dot product): a.length = " +
                a.length +
                " != " +
                b.length +
                " = b.length."
            );
            return undefined;
          }
          return dotspVectorVector(b, a);
          break;
        case "ComplexVector":
          if (a.length != b.length) {
            error(
              "Error in mul(a,b) (dot product): a.length = " +
                a.length +
                " != " +
                b.length +
                " = b.length."
            );
            return undefined;
          }
          return dotComplexVectorVector(b, a);
          break;
        case "matrix":
          if (b.m == 1) return outerprodVectors(a, b.val);
          else {
            error(
              "Inconsistent dimensions in mul(a,B): size(a) = [" +
                sa[0] +
                "," +
                sa[1] +
                "], size(B) = [" +
                sb[0] +
                "," +
                sb[1] +
                "]"
            );
            return undefined;
          }
          break;
        case "spmatrix":
          if (b.m == 1) return outerprodVectors(a, fullMatrix(b).val);
          else {
            error(
              "Inconsistent dimensions in mul(a,B): size(a) = [" +
                sa[0] +
                "," +
                sa[1] +
                "], size(B) = [" +
                sb[0] +
                "," +
                sb[1] +
                "]"
            );
            return undefined;
          }
          break;
        case "ComplexMatrix":
          if (b.m == 1)
            return transpose(
              outerprodComplexVectorVector(
                new ComplexVector(b.re, b.im, true),
                a,
                b.val
              )
            );
          else {
            error(
              "Inconsistent dimensions in mul(a,B): size(a) = [" +
                sa[0] +
                "," +
                sa[1] +
                "], size(B) = [" +
                sb[0] +
                "," +
                sb[1] +
                "]"
            );
            return undefined;
          }
          break;
        default:
          return undefined;
          break;
      }
      break;
    case "spvector":
      switch (type(b)) {
        case "number":
          return mulScalarspVector(b, a);
          break;
        case "vector":
          if (a.length != b.length) {
            error(
              "Error in mul(a,b) (dot product): a.length = " +
                a.length +
                " != " +
                b.length +
                " = b.length."
            );
            return undefined;
          }
          return dotspVectorVector(a, b);
          break;
        case "spvector":
          if (a.length != b.length) {
            error(
              "Error in mul(a,b) (dot product): a.length = " +
                a.length +
                " != " +
                b.length +
                " = b.length."
            );
            return undefined;
          }
          return spdot(b, a);
          break;
        case "matrix":
          if (b.m == 1) return outerprodspVectorVector(a, b.val);
          else {
            error(
              "Inconsistent dimensions in mul(a,B): size(a) = [" +
                sa[0] +
                "," +
                sa[1] +
                "], size(B) = [" +
                sb[0] +
                "," +
                sb[1] +
                "]"
            );
            return undefined;
          }
          break;
        case "spmatrix":
          if (b.m == 1) return outerprodspVectorVector(a, fullMatrix(b).val);
          else {
            error(
              "Inconsistent dimensions in mul(a,B): size(a) = [" +
                sa[0] +
                "," +
                sa[1] +
                "], size(B) = [" +
                sb[0] +
                "," +
                sb[1] +
                "]"
            );
            return undefined;
          }
          break;
        default:
          return undefined;
          break;
      }
      break;
    case "ComplexVector":
      switch (type(b)) {
        case "number":
          return mulScalarComplexVector(b, a);
          break;
        case "Complex":
          return mulComplexComplexVector(b, a);
          break;
        case "vector":
          if (a.length != b.length) {
            error(
              "Error in mul(a,b) (dot product): a.length = " +
                a.length +
                " != " +
                b.length +
                " = b.length."
            );
            return undefined;
          }
          return dotComplexVectorVector(a, b);
          break;
        case "spvector":
          if (a.length != b.length) {
            error(
              "Error in mul(a,b) (dot product): a.length = " +
                a.length +
                " != " +
                b.length +
                " = b.length."
            );
            return undefined;
          }
          return dotComplexVectorspVector(a, b);
          break;
        case "matrix":
          if (b.m == 1) return outerprodComplexVectorVector(a, b.val);
          else {
            error(
              "Inconsistent dimensions in mul(a,B): size(a) = [" +
                sa[0] +
                "," +
                sa[1] +
                "], size(B) = [" +
                sb[0] +
                "," +
                sb[1] +
                "]"
            );
            return undefined;
          }
          break;
        case "spmatrix":
          if (b.m == 1)
            return outerprodComplexVectorVector(a, fullMatrix(b).val);
          else {
            error(
              "Inconsistent dimensions in mul(a,B): size(a) = [" +
                sa[0] +
                "," +
                sa[1] +
                "], size(B) = [" +
                sb[0] +
                "," +
                sb[1] +
                "]"
            );
            return undefined;
          }
          break;
        case "ComplexMatrix":
          if (b.m == 1)
            return outerprodComplexVectors(
              a,
              new ComplexVector(b.re, b.im, true)
            );
          else {
            error(
              "Inconsistent dimensions in mul(a,B): size(a) = [" +
                sa[0] +
                "," +
                sa[1] +
                "], size(B) = [" +
                sb[0] +
                "," +
                sb[1] +
                "]"
            );
            return undefined;
          }
          break;
        default:
          return undefined;
          break;
      }
      break;

    case "matrix":
      switch (type(b)) {
        case "number":
          return mulScalarMatrix(b, a);
          break;
        case "Complex":
          return mulComplexMatrix(b, a);
          break;
        case "vector":
          if (a.m == 1) {
            // dot product with explicit transpose
            if (a.val.length != b.length) {
              error(
                "Error in mul(a',b): a.length = " +
                  a.val.length +
                  " != " +
                  b.length +
                  " =  b.length."
              );
              return undefined;
            }
            return dot(a.val, b);
          } else {
            if (a.n != b.length) {
              error(
                "Error in mul(A,b): A.n = " +
                  a.n +
                  " != " +
                  b.length +
                  " = b.length."
              );
              return undefined;
            }
            return mulMatrixVector(a, b);
          }
          break;
        case "spvector":
          if (a.m == 1) {
            // dot product with explicit transpose
            if (a.val.length != b.length) {
              error(
                "Error in mul(a',b): a.length = " +
                  a.val.length +
                  " != " +
                  b.length +
                  " =  b.length."
              );
              return undefined;
            }
            return dotspVectorVector(b, a.val);
          } else {
            if (a.n != b.length) {
              error(
                "Error in mul(A,b): A.n = " +
                  a.n +
                  " != " +
                  b.length +
                  " = b.length."
              );
              return undefined;
            }
            return mulMatrixspVector(a, b);
          }
          break;
        case "ComplexVector":
          if (a.m == 1) {
            // dot product with explicit transpose
            if (a.val.length != b.length) {
              error(
                "Error in mul(a',b): a.length = " +
                  a.val.length +
                  " != " +
                  b.length +
                  " =  b.length."
              );
              return undefined;
            }
            return dotComplexVectorVector(b, a.val);
          } else {
            if (a.n != b.length) {
              error(
                "Error in mul(A,b): A.n = " +
                  a.n +
                  " != " +
                  b.length +
                  " = b.length."
              );
              return undefined;
            }
            return mulMatrixComplexVector(a, b);
          }
          break;
        case "matrix":
          if (a.n != b.m) {
            error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
            return undefined;
          }
          return mulMatrixMatrix(a, b);
          break;
        case "spmatrix":
          if (a.n != b.m) {
            error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
            return undefined;
          }
          return mulMatrixspMatrix(a, b);
          break;
        case "ComplexMatrix":
          if (a.n != b.m) {
            error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
            return undefined;
          }
          return transpose(mulComplexMatrixMatrix(transpose(b), transpose(a)));
          break;
        default:
          return undefined;
          break;
      }
      break;
    case "spmatrix":
      switch (type(b)) {
        case "number":
          return mulScalarspMatrix(b, a);
          break;
        case "vector":
          if (a.m == 1) {
            // dot product with explicit transpose
            if (a.n != b.length) {
              error(
                "Error in mul(a',b): a.length = " +
                  a.val.length +
                  " != " +
                  b.length +
                  " =  b.length."
              );
              return undefined;
            }
            return dot(fullMatrix(a).val, b);
          } else {
            if (a.n != b.length) {
              error(
                "Error in mul(A,b): A.n = " +
                  a.n +
                  " != " +
                  b.length +
                  " = b.length."
              );
              return undefined;
            }
            return mulspMatrixVector(a, b);
          }
          break;
        case "spvector":
          if (a.m == 1) {
            // dot product with explicit transpose
            if (a.n != b.length) {
              error(
                "Error in mul(a',b): a.length = " +
                  a.val.length +
                  " != " +
                  b.length +
                  " =  b.length."
              );
              return undefined;
            }
            return dotspVectorVector(b, fullMatrix(a).val);
          } else {
            if (a.n != b.length) {
              error(
                "Error in mul(A,b): A.n = " +
                  a.n +
                  " != " +
                  b.length +
                  " = b.length."
              );
              return undefined;
            }
            return mulspMatrixspVector(a, b);
          }
          break;
        case "matrix":
          if (a.n != b.m) {
            error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
            return undefined;
          }
          return mulspMatrixMatrix(a, b);
          break;
        case "spmatrix":
          if (a.n != b.m) {
            error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
            return undefined;
          }
          return mulspMatrixspMatrix(a, b);
          break;
        default:
          return undefined;
          break;
      }
      break;
    case "ComplexMatrix":
      switch (type(b)) {
        case "number":
          return mulScalarComplexMatrix(b, a);
          break;
        case "Complex":
          return mulComplexComplexMatrix(b, a);
          break;
        case "vector":
          if (a.m == 1) {
            // dot product with explicit transpose
            if (a.val.length != b.length) {
              error(
                "Error in mul(a',b): a.length = " +
                  a.val.length +
                  " != " +
                  b.length +
                  " =  b.length."
              );
              return undefined;
            }
            return dotComplexVectorVector(
              new ComplexVector(a.re, a.im, true),
              b
            );
          } else {
            if (a.n != b.length) {
              error(
                "Error in mul(A,b): A.n = " +
                  a.n +
                  " != " +
                  b.length +
                  " = b.length."
              );
              return undefined;
            }
            return mulComplexMatrixVector(a, b);
          }
          break;
        case "spvector":
          if (a.m == 1) {
            // dot product with explicit transpose
            if (a.val.length != b.length) {
              error(
                "Error in mul(a',b): a.length = " +
                  a.val.length +
                  " != " +
                  b.length +
                  " =  b.length."
              );
              return undefined;
            }
            return dotComplexVectorspVector(
              new ComplexVector(a.re, a.im, true),
              b
            );
          } else {
            if (a.n != b.length) {
              error(
                "Error in mul(A,b): A.n = " +
                  a.n +
                  " != " +
                  b.length +
                  " = b.length."
              );
              return undefined;
            }
            return mulComplexMatrixspVector(a, b);
          }
          break;
        case "ComplexVector":
          if (a.m == 1) {
            // dot product with explicit transpose
            if (a.val.length != b.length) {
              error(
                "Error in mul(a',b): a.length = " +
                  a.val.length +
                  " != " +
                  b.length +
                  " =  b.length."
              );
              return undefined;
            }
            return dotComplexVectors(new ComplexVector(a.re, a.im, true), b);
          } else {
            if (a.n != b.length) {
              error(
                "Error in mul(A,b): A.n = " +
                  a.n +
                  " != " +
                  b.length +
                  " = b.length."
              );
              return undefined;
            }
            return mulComplexMatrixComplexVector(a, b);
          }
          break;
        case "matrix":
          if (a.n != b.m) {
            error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
            return undefined;
          }
          return mulComplexMatrixMatrix(a, b);
          break;
        case "spmatrix":
          if (a.n != b.m) {
            error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
            return undefined;
          }
          return mulComplexMatrixspMatrix(a, b);
          break;
        case "ComplexMatrix":
          if (a.n != b.m) {
            error("Error in mul(A,B): A.n = " + a.n + " != " + b.m + " = B.m.");
            return undefined;
          }
          return mulComplexMatrices(a, b);
          break;
        default:
          return undefined;
          break;
      }
      break;
    default:
      return undefined;
      break;
  }
}

function transpose(A) {
  var i;
  var j;
  switch (type(A)) {
    case "number":
      return A;
      break;
    case "vector":
      var res = new Matrix(1, A.length, A);
      return res; // matrix with a single row
      break;
    case "spvector":
      return transposespVector(A);
      break;
    case "ComplexVector":
      var res = new ComplexMatrix(1, A.length, conj(A));
      return res; // matrix with a single row
      break;
    case "matrix":
      return transposeMatrix(A);
      break;
    case "spmatrix":
      return transposespMatrix(A);
      break;
    case "ComplexMatrix":
      return transposeComplexMatrix(A);
      break;
    default:
      return undefined;
      break;
  }
}

function Matrix(m, n, values) {
  /** @const */ this.length = m;
  /** @const */ this.m = m;
  /** @const */ this.n = n;
  /** @const */ this.size = [m, n];
  /** @const */ this.type = "matrix";

  if (arguments.length == 2) this.val = new Float64Array(m * n);
  // simple m x n zeros
  else if (arguments.length == 3) this.val = new Float64Array(values);
  // m x n filled with values with copy
  else if (arguments.length == 4) this.val = values; // m x n filled with values without copy
}

function size(A, sizealongdimension) {
  var s;
  switch (type(A)) {
    case "string":
    case "boolean":
    case "number":
    case "Complex":
      s = [1, 1];
      break;
    case "vector":
    case "spvector":
    case "ComplexVector":
      s = [A.length, 1];
      break;
    case "matrix":
    case "spmatrix":
    case "ComplexMatrix":
      s = A.size;
      break;
    case "object":
      s = [1, 1];
      break;
    default:
      s = [1, 1];
      //error( "Cannot determine size of object" );
      break;
  }

  if (typeof sizealongdimension == "undefined") return s;
  else return s[sizealongdimension - 1];
}

function isScalar(x) {
  switch (typeof x) {
    case "string":
    case "number":
    case "boolean":
      return true;
      break;
    default:
      if (type(x) == "Complex") return true;
      else return false;
      break;
  }
}

function dot(a, b) {
  const n = a.length;
  var i;
  var res = 0;
  for (i = 0; i < n; i++) res += a[i] * b[i];
  return res;
}

function error(msg) {
  throw new Error(msg);
  //	postMessage( {"error": msg} );
}

function solveWithQRcolumnpivoting(A, b) {
  var m;
  var n;
  var R;
  var V;
  var beta;
  var r;
  var piv;
  if (type(A) == "matrix") {
    // Compute the QR factorization
    m = A.m;
    n = A.n;
    var QRfact = qr(A);
    R = QRfact.R;
    V = QRfact.V;
    beta = QRfact.beta;
    r = QRfact.rank;
    piv = QRfact.piv;
  } else {
    // we get the QR factorization in A
    R = A.R;
    r = A.rank;
    V = A.V;
    beta = A.beta;
    piv = A.piv;
    m = R.m;
    n = R.n;
  }

  var btmp = vectorCopy(b);
  var j;
  var i;
  var k;

  var smallb;
  // b = Q' * b
  for (j = 0; j < r; j++) {
    // b(j:m) = (I - beta v v^T ) * b(j:m)
    smallb = get(btmp, range(j, m));

    set(btmp, range(j, m), sub(smallb, mul(beta[j] * mul(V[j], smallb), V[j])));
  }
  // Solve R x = b with backsubstitution
  var x = zeros(n);

  if (r > 1) {
    set(x, range(0, r), backsubstitution(R, get(btmp, range(r))));
    // note: if m < n, backsubstitution only uses n columns of R.
  } else {
    x[0] = btmp[0] / R.val[0];
  }

  // and apply permutations
  for (j = r - 1; j >= 0; j--) {
    if (piv[j] != j) {
      var tmp = x[j];
      x[j] = x[piv[j]];
      x[piv[j]] = tmp;
    }
  }
  return x;
}

function qr(A, compute_Q) {
  // QR factorization with column pivoting AP = QR based on Householder reflections
  // A with m rows and n cols; m >= n (well, it also works with m < n)
  // piv = vector of permutations : P = P_rank with P_j = identity with swaprows ( j, piv(j) )

  // Implemented with R transposed for faster computations on rows instead of columns

  /* TEST
	A  = [[12,-51,4],[6,167,-68],[-4,24,-41]]
	QR = qr(A)
	QR.R
	
	
	*/
  const m = A.m;
  const n = A.n;

  /*
	if ( n > m)
		return "QR factorization unavailable for n > m.";
	*/

  var i;
  var j;

  var householder;
  var R = transpose(A); // transposed for faster implementation
  var Q;

  var V = []; // store householder vectors in this list (not a matrix)
  var beta = zeros(n);
  var piv = zeros(n);

  var smallR;

  var r = -1; // rank estimate -1

  var normA = norm(A);
  var normR22 = normA;
  var Rij;

  const TOL = 1e-5;
  var TOLnormR22square = TOL * normA;
  TOLnormR22square *= TOLnormR22square;

  var tau = 0;
  var k = 0;
  var c = zeros(n);
  for (j = 0; j < n; j++) {
    var Rj = R.val.subarray(j * R.n, j * R.n + R.n);
    c[j] = dot(Rj, Rj);
    if (c[j] > tau) {
      tau = c[j];
      k = j;
    }
  }

  var updateR = function (r, v, beta) {
    // set ( R, range(r,n), range(r,m) , subMatrices (  smallR , outerprodVectors( mulMatrixVector( smallR, householder.v), householder.v,  householder.beta ) ) ) ;
    // most of the time is spent here...
    var i, j, l;
    var m_r = m - r;
    for (i = r; i < n; i++) {
      var smallRiv = 0;
      var Ri = i * m + r; // =  i * R.n + r
      var Rval = R.val.subarray(Ri, Ri + m_r);
      for (l = 0; l < m_r; l++) smallRiv += Rval[l] * v[l]; //smallRiv += R.val[Ri + l] * v[l];
      smallRiv *= beta;
      for (j = 0; j < m_r; j++) {
        Rval[j] -= smallRiv * v[j]; // R.val[Ri + j] -= smallRiv * v[j];
      }
    }
  };

  // Update c
  var updateC = function (r) {
    var j;
    for (j = r + 1; j < n; j++) {
      var Rjr = R.val[j * m + r];
      c[j] -= Rjr * Rjr;
    }

    // tau, k = max ( c[r+1 : n] )
    k = r + 1;
    tau = c[r + 1];
    for (j = r + 2; j < n; j++) {
      if (c[j] > tau) {
        tau = c[j];
        k = j;
      }
    }
  };

  // Compute norm of residuals
  var computeNormR22 = function (r) {
    //normR22 = norm(get ( R, range(r+1,n), range(r+1,m), ) );
    var normR22 = 0;
    var i = r + 1;
    var ri = i * m;
    var j;
    while (i < n && normR22 <= TOLnormR22square) {
      for (j = r + 1; j < m; j++) {
        var Rij = R.val[ri + j];
        normR22 += Rij * Rij;
      }
      i++;
      ri += m;
    }
    return normR22;
  };

  while (tau > EPS && r < n - 1 && normR22 > TOLnormR22square) {
    r++;

    piv[r] = k;
    swaprows(R, r, k);
    c[k] = c[r];
    c[r] = tau;

    if (r < m - 1) {
      householder = house(R.val.subarray(r * R.n + r, r * R.n + m)); // house only reads vec so subarray is ok
    } else {
      householder.v = [1];
      householder.beta = 0;
      //smallR = R[m-1][m-1];
    }

    if (r < n - 1) {
      // smallR is a matrix
      updateR(r, householder.v, householder.beta);
    } else {
      // smallR is a row vector (or a number if m=n):
      if (r < m - 1) {
        updateR(r, householder.v, householder.beta);
        /*
				var r_to_m = range(r,m);
				smallR = get(R, r, r_to_m);
				set ( R, r , r_to_m, sub (  smallR , transpose(mul( householder.beta * mul( smallR, householder.v) ,householder.v  ) )) ) ;*/
      } else {
        //var smallRnumber = R.val[(m-1)*R.n + m-1]; // beta is zero, so no update
        //set ( R, r , r, sub (  smallRnumber , transpose(mul( householder.beta * mul( smallRnumber, householder.v) ,householder.v  ) )) ) ;
      }
    }

    // Store householder vectors and beta
    V[r] = vectorCopy(householder.v);
    beta[r] = householder.beta;

    if (r < n - 1) {
      // Update c
      updateC(r);

      // stopping criterion for rank estimation
      if (r < m - 1) normR22 = computeNormR22(r);
      else normR22 = 0;
    }
  }

  if (compute_Q) {
    Q = eye(m);
    var smallQ;
    var nmax = r;
    if (m > r + 1) nmax = r - 1;
    for (j = nmax; j >= 0; j--) {
      if (j == m - 1) {
        Q.val[j * m + j] -= beta[j] * V[j][0] * V[j][0] * Q.val[j * m + j];
      } else {
        var j_to_m = range(j, m);
        smallQ = get(Q, j_to_m, j_to_m); // matrix
        set(
          Q,
          j_to_m,
          j_to_m,
          subMatrices(
            smallQ,
            outerprodVectors(
              V[j],
              mulMatrixVector(transposeMatrix(smallQ), V[j]),
              beta[j]
            )
          )
        );
      }
    }
  }

  return { Q: Q, R: transpose(R), V: V, beta: beta, piv: piv, rank: r + 1 };
}

function transposeMatrix(A) {
  var i;
  var j;
  const m = A.m;
  const n = A.n;
  if (m > 1) {
    var res = zeros(n, m);
    var Aj = 0;
    for (j = 0; j < m; j++) {
      var ri = 0;
      for (i = 0; i < n; i++) {
        res.val[ri + j] = A.val[Aj + i];
        ri += m;
      }
      Aj += n;
    }
    return res;
  } else {
    return A.val;
  }
}

function zeros(rows, cols) {
  // Create a matrix or vector of ZERO
  if (arguments.length == 1 || cols == 1) {
    return new Float64Array(rows);
  } else {
    return new Matrix(rows, cols);
  }
}

function norm(A, sumalongdimension) {
  // l2-norm (Euclidean norm) of vectors or Frobenius norm of matrix
  var i;
  var j;
  switch (type(A)) {
    case "number":
      return Math.abs(A);
      break;
    case "vector":
      if (arguments.length == 1 || sumalongdimension == 1) {
        return Math.sqrt(dot(A, A));
      } else return abs(A);
      break;
    case "spvector":
      if (arguments.length == 1 || sumalongdimension == 1) {
        return Math.sqrt(dot(A.val, A.val));
      } else return abs(A);
      break;
    case "matrix":
      if (arguments.length == 1) {
        return Math.sqrt(dot(A.val, A.val));
      } else if (sumalongdimension == 1) {
        // norm of columns, result is row vector
        const n = A.n;
        var res = zeros(1, n);
        var r = 0;
        for (i = 0; i < A.m; i++) {
          for (j = 0; j < n; j++) res.val[j] += A.val[r + j] * A.val[r + j];
          r += n;
        }
        for (j = 0; j < n; j++) res.val[j] = Math.sqrt(res.val[j]);
        return res;
      } else if (sumalongdimension == 2) {
        // norm of rows, result is column vector
        var res = zeros(A.m);
        var r = 0;
        for (i = 0; i < A.m; i++) {
          for (j = 0; j < A.n; j++) res[i] += A.val[r + j] * A.val[r + j];
          r += A.n;
          res[i] = Math.sqrt(res[i]);
        }

        return res;
      } else return "undefined";
      break;
    case "spmatrix":
      if (arguments.length == 1) {
        return Math.sqrt(dot(A.val, A.val));
      } else if (sumalongdimension == 1 && !A.rowmajor) {
        // norm of columns, result is row vector
        const nn = A.n;
        var res = zeros(1, nn);
        for (j = 0; j < nn; j++) {
          var s = A.cols[j];
          var e = A.cols[j + 1];
          for (var k = s; k < e; k++) res.val[j] += A.val[k] * A.val[k];
          res.val[j] = Math.sqrt(res.val[j]);
        }
        return res;
      } else if (sumalongdimension == 2 && A.rowmajor) {
        // norm of rows, result is column vector
        var res = zeros(A.m);
        for (i = 0; i < A.m; i++) {
          var s = A.rows[i];
          var e = A.rows[i + 1];
          for (var k = s; k < e; k++) res[i] += A.val[k] * A.val[k];
          res[i] = Math.sqrt(res[i]);
        }

        return res;
      } else return "undefined";
      break;
    default:
      return "undefined";
  }
}

function swaprows(A, i, j) {
  if (i != j) {
    var ri = i * A.n;
    var rj = j * A.n;
    var tmp = vectorCopy(A.val.subarray(ri, ri + A.n));
    A.val.set(vectorCopy(A.val.subarray(rj, rj + A.n)), ri);
    A.val.set(tmp, rj);
  }
}

function vectorCopy(a) {
  return new Float64Array(a);
}

function house(x) {
  // Compute Houselholder vector v such that
  // P = (I - beta v v') is orthogonal and Px = ||x|| e_1

  const n = x.length;
  var i;
  var mu;
  var beta;
  var v = zeros(n);
  var v0;
  var sigma;

  var x0 = x[0];
  var xx = dot(x, x);

  // sigma = x(2:n)^T x(2:n)
  sigma = xx - x0 * x0;

  if (isZero(sigma)) {
    // x(2:n) is zero =>  v=[1,0...0], beta = 0
    beta = 0;
    v[0] = 1;
  } else {
    mu = Math.sqrt(xx); // norm(x) ; //Math.sqrt( x0*x0 + sigma );
    if (x0 < EPS) {
      v0 = x0 - mu;
    } else {
      v0 = -sigma / (x0 + mu);
    }

    beta = (2 * v0 * v0) / (sigma + v0 * v0);

    // v = [v0,x(2:n)] / v0
    v[0] = 1;
    for (i = 1; i < n; i++) v[i] = x[i] / v0;
  }

  return { v: v, beta: beta };
}

function isZero(x) {
  return Math.abs(x) < EPS;
}

function get(A, rowsrange, colsrange) {
  var typerows = typeof rowsrange;
  var typecols = typeof colsrange;

  if (arguments.length == 1) return matrixCopy(A);

  var typeA = type(A);
  if (typeA == "vector") {
    if (typerows == "number") {
      if (rowsrange >= 0 && rowsrange < A.length) return A[rowsrange];
      // get v[i]
      else {
        error(
          "Error in a[i] = get(a,i): Index i=" +
            rowsrange +
            " out of bounds [0," +
            (A.length - 1) +
            "]"
        );
        return undefined;
      }
    } else {
      return getSubVector(A, rowsrange);
    }
  } else if (typeA == "matrix") {
    if (typerows == "number") rowsrange = [rowsrange];

    if (typecols == "number") colsrange = [colsrange];

    if (rowsrange.length == 1 && colsrange.length == 1)
      return A.val[rowsrange[0] * A.n + colsrange[0]]; // get ( A, i, j)

    if (rowsrange.length == 0) return getCols(A, colsrange); // get(A,[],4) <=> cols(A,4)

    if (colsrange.length == 0) return getRows(A, rowsrange); // get(A,3,[]) <=> rows(A,3)

    // otherwise:
    return getSubMatrix(A, rowsrange, colsrange);
  } else if (typeA == "Array") {
    if (typerows == "number") return A[rowsrange];
    else return getSubArray(A, rowsrange);
  } else if (typeA == "spmatrix") {
    if (typerows == "number") rowsrange = [rowsrange];

    if (typecols == "number") colsrange = [colsrange];

    if (rowsrange.length == 1 && colsrange.length == 1)
      return A.get(rowsrange[0], colsrange[0]); // get ( A, i, j)

    if (rowsrange.length == 1 && A.rowmajor) return A.row(rowsrange[0]);
    if (colsrange.length == 1 && !A.rowmajor) return A.col(colsrange[0]);

    if (colsrange.length == 0) return spgetRows(A, rowsrange);
    if (rowsrange.length == 0) return spgetCols(A, colsrange);

    // TODO
  } else if (typeA == "spvector") {
    if (typerows == "number") return A.get(rowsrange);
    // get v[i]
    else return getSubspVector(A, rowsrange); //TODO
  } else if (typeA == "ComplexVector") {
    if (typerows == "number") return A.get(rowsrange);
    // get v[i]
    else return A.getSubVector(rowsrange);
  } else if (typeA == "ComplexMatrix") {
    if (typerows == "number") rowsrange = [rowsrange];

    if (typecols == "number") colsrange = [colsrange];

    if (rowsrange.length == 1 && colsrange.length == 1) return A.get(i, j);

    if (rowsrange.length == 0) return A.getCols(colsrange); // get(A,[],4) <=> cols(A,4)

    if (colsrange.length == 0) return A.getRows(rowsrange); // get(A,3,[]) <=> rows(A,3)

    // otherwise:
    return A.getSubMatrix(rowsrange, colsrange);
  }
  return undefined;
}

function range(start, end, inc) {
  // python-like range function
  // returns [0,... , end-1]
  if (typeof start == "undefined") return [];

  if (typeof inc == "undefined") var inc = 1;
  if (typeof end == "undefined") {
    var end = start;
    start = 0;
  }

  if (start == end - inc) {
    return start;
  } else if (start == end) {
    return [];
  } else if (start > end) {
    if (inc > 0) inc *= -1;
    var r = new Array(Math.floor((start - end) / Math.abs(inc)));
    var k = 0;
    for (var i = start; i > end; i += inc) {
      r[k] = i;
      k++;
    }
  } else {
    var r = new Array(Math.floor((end - start) / inc));
    var k = 0;
    for (var i = start; i < end; i += inc) {
      r[k] = i;
      k++;
    }
  }
  return r;
}

function getSubVector(a, rowsrange) {
  const n = rowsrange.length;
  var res = new Float64Array(n);
  for (var i = 0; i < n; i++) {
    res[i] = a[rowsrange[i]];
  }
  return res;
}

function set(A, rowsrange, colsrange, B) {
  var i;
  var j;
  var k;
  var l;
  var n;

  var typerows = typeof rowsrange;
  var typecols = typeof colsrange;

  if (arguments.length == 1) return undefined;

  var typeA = type(A);
  if (typeA == "vector") {
    B = colsrange;
    if (typerows == "number") {
      A[rowsrange] = B;
      return B;
    } else if (rowsrange.length == 0) rowsrange = range(A.length);

    if (size(B, 1) == 1) {
      setVectorScalar(A, rowsrange, B);
    } else {
      setVectorVector(A, rowsrange, B);
    }
    return B;
  } else if (typeA == "matrix") {
    if (typerows == "number") rowsrange = [rowsrange];
    if (typecols == "number") colsrange = [colsrange];

    if (rowsrange.length == 1 && colsrange.length == 1) {
      A.val[rowsrange[0] * A.n + colsrange[0]] = B;
      return B;
    }

    if (rowsrange.length == 0) {
      setCols(A, colsrange, B);
      return B;
    }

    if (colsrange.length == 0) {
      setRows(A, rowsrange, B);
      return B;
    }

    // Set a submatrix
    var sB = size(B);
    var tB = type(B);
    if (sB[0] == 1 && sB[1] == 1) {
      if (tB == "number") setMatrixScalar(A, rowsrange, colsrange, B);
      else if (tB == "vector") setMatrixScalar(A, rowsrange, colsrange, B[0]);
      else setMatrixScalar(A, rowsrange, colsrange, B.val[0]);
    } else {
      if (colsrange.length == 1)
        setMatrixColVector(A, rowsrange, colsrange[0], B);
      else if (rowsrange.length == 1) {
        if (tB == "vector") setMatrixRowVector(A, rowsrange[0], colsrange, B);
        else setMatrixRowVector(A, rowsrange[0], colsrange, B.val);
      } else setMatrixMatrix(A, rowsrange, colsrange, B);
    }
    return B;
  } else if (typeA == "ComplexVector") {
    B = colsrange;
    if (typerows == "number") {
      A.set(rowsrange, B);
      return B;
    } else if (rowsrange.length == 0) rowsrange = range(A.length);

    if (size(B, 1) == 1) {
      A.setVectorScalar(rowsrange, B);
    } else {
      A.setVectorVector(rowsrange, B);
    }
    return B;
  }
}

export function sub(a, b) {
  const ta = type(a);
  const tb = type(b);
  if (ta == "number" && tb == "number") return a - b;
  else if (ta == "number") {
    switch (tb) {
      case "Complex":
        return addComplexReal(minusComplex(b), a);
        break;
      case "vector":
        return subScalarVector(a, b);
        break;
      case "matrix":
        return subScalarMatrix(a, b);
        break;
      case "spvector":
        return subScalarspVector(a, b);
        break;
      case "spmatrix":
        return subScalarspMatrix(a, b);
        break;
      default:
        return undefined;
        break;
    }
  } else if (tb == "number") {
    switch (ta) {
      case "Complex":
        return addComplexReal(b, -a);
        break;
      case "vector":
        return subVectorScalar(a, b);
        break;
      case "matrix":
        return subMatrixScalar(a, b);
        break;
      case "spvector":
        return addScalarspVector(-b, a);
        break;
      case "spmatrix":
        return addScalarspMatrix(-b, a);
        break;
      default:
        return undefined;
        break;
    }
  } else if (ta == "vector") {
    switch (tb) {
      case "vector":
        // vector substraction
        if (a.length != b.length) {
          error(
            "Error in sub(a,b): a.length = " +
              a.length +
              " != " +
              b.length +
              " = b.length."
          );
          return undefined;
        }
        return subVectors(a, b);
        break;
      case "spvector":
        // vector substraction
        if (a.length != b.length) {
          error(
            "Error in sub(a,b): a.length = " +
              a.length +
              " != " +
              b.length +
              " = b.length."
          );
          return undefined;
        }
        return subVectorspVector(a, b);
        break;
      case "matrix":
      case "spmatrix":
      default:
        error("Error in sub(a,B): a is a vector and B is a " + tb + ".");
        return undefined;
        break;
    }
  } else if (ta == "matrix") {
    switch (tb) {
      case "matrix":
        // Matrix sub
        if (a.m != b.m || a.n != b.n) {
          error(
            "Error in sub(A,B): size(A) = [" +
              a.m +
              "," +
              a.n +
              "] != [" +
              b.m +
              "," +
              b.n +
              "] = size(B)."
          );
          return undefined;
        }
        return subMatrices(a, b);
        break;
      case "spmatrix":
        // Matrix addition
        if (a.m != b.m || a.n != b.n) {
          error(
            "Error in sub(A,B): size(A) = [" +
              a.m +
              "," +
              a.n +
              "] != [" +
              b.m +
              "," +
              b.n +
              "] = size(B)."
          );
          return undefined;
        }
        return subMatrixspMatrix(a, b);
        break;
      case "vector":
      case "spvector":
      default:
        error("Error in sub(A,b): A is a matrix and b is a " + tb + ".");
        return undefined;
        break;
    }
  } else if (ta == "spvector") {
    switch (tb) {
      case "vector":
        if (a.length != b.length) {
          error(
            "Error in sub(a,b): a.length = " +
              a.length +
              " != " +
              b.length +
              " = b.length."
          );
          return undefined;
        }
        return subspVectorVector(a, b);
        break;
      case "spvector":
        if (a.length != b.length) {
          error(
            "Error in sub(a,b): a.length = " +
              a.length +
              " != " +
              b.length +
              " = b.length."
          );
          return undefined;
        }
        return subspVectors(a, b);
        break;
      case "matrix":
      case "spmatrix":
      default:
        error("Error in sub(a,B): a is a sparse vector and B is a " + tb + ".");
        return undefined;
        break;
    }
  } else if (ta == "spmatrix") {
    switch (tb) {
      case "matrix":
        if (a.m != b.m || a.n != b.n) {
          error(
            "Error in sub(A,B): size(A) = [" +
              a.m +
              "," +
              a.n +
              "] != [" +
              b.m +
              "," +
              b.n +
              "] = size(B)."
          );
          return undefined;
        }
        return subspMatrixMatrix(a, b);
        break;
      case "spmatrix":
        if (a.m != b.m || a.n != b.n) {
          error(
            "Error in sub(A,B): size(A) = [" +
              a.m +
              "," +
              a.n +
              "] != [" +
              b.m +
              "," +
              b.n +
              "] = size(B)."
          );
          return undefined;
        }
        return subspMatrices(a, b);
        break;
      case "vector":
      case "spvector":
      default:
        error("Error in sub(A,b): a is a sparse matrix and B is a " + tb + ".");
        return undefined;
        break;
    }
  } else return undefined;
}

function mulScalarVector(scalar, vec) {
  var i;
  const n = vec.length;
  var res = new Float64Array(vec);
  for (i = 0; i < n; i++) res[i] *= scalar;
  return res;
}

function subVectors(a, b) {
  const n = a.length;
  var c = new Float64Array(a);
  for (var i = 0; i < n; i++) c[i] -= b[i];
  return c;
}

function setVectorVector(A, rowsrange, B) {
  var i;
  for (i = 0; i < rowsrange.length; i++) A[rowsrange[i]] = B[i];
}

export function min(a, b) {
  var ta = type(a);

  if (arguments.length == 1) {
    switch (ta) {
      case "vector":
        return minVector(a);
        break;
      case "spvector":
        var m = minVector(a.val);
        if (m > 0 && a.val.length < a.length) return 0;
        else return m;
        break;
      case "matrix":
        return minMatrix(a);
        break;
      case "spmatrix":
        var m = minVector(a.val);
        if (m > 0 && a.val.length < a.m * a.n) return 0;
        else return m;
        break;
      default:
        return a;
        break;
    }
  }

  var tb = type(b);
  if (ta == "spvector") {
    a = fullVector(a);
    ta = "vector";
  }
  if (ta == "spmatrix") {
    a = fullMatrix(a);
    ta = "matrix";
  }
  if (tb == "spvector") {
    b = fullVector(b);
    tb = "vector";
  }
  if (tb == "spmatrix") {
    b = fullMatrix(b);
    tb = "matrix";
  }

  if (ta == "number" && tb == "number") return Math.min(a, b);
  else if (ta == "number") {
    if (tb == "vector") return minVectorScalar(b, a);
    else return minMatrixScalar(b, a);
  } else if (tb == "number") {
    if (ta == "vector") return minVectorScalar(a, b);
    else {
      // MAtrix , scalar
      if (b == 1) return minMatrixRows(a);
      // return row vector of min of columns
      else if (b == 2) return minMatrixCols(a);
      // return column vector of min of rows
      else return minMatrixScalar(a, b);
    }
  } else if (ta == "vector") {
    if (tb == "vector") return minVectorVector(a, b);
    else return "undefined";
  } else {
    if (tb == "matrix") return minMatrixMatrix(a, b);
    else return "undefined";
  }
}

function minVector(a) {
  const n = a.length;
  var res = a[0];
  for (var i = 1; i < n; i++) {
    if (a[i] < res) res = a[i];
  }
  return res;
}

function subVectorScalar(vec, scalar) {
  const n = vec.length;
  var res = new Float64Array(vec);
  for (var i = 0; i < n; i++) res[i] -= scalar;

  return res;
}

export function entrywisediv(a, b) {
  var ta = type(a);
  var tb = type(b);

  switch (ta) {
    case "number":
      switch (tb) {
        case "number":
          return a / b;
          break;
        case "vector":
          return divScalarVector(a, b);
          break;
        case "matrix":
          return divScalarMatrix(a, b);
          break;
        case "spvector":
          return divScalarspVector(a, b);
          break;
        case "spmatrix":
          return divScalarspMatrix(a, b);
          break;
        default:
          error(
            "Error in entrywisediv(a,b): b must be a number, a vector or a matrix."
          );
          return undefined;
      }
      break;
    case "vector":
      switch (tb) {
        case "number":
          return divVectorScalar(a, b);
          break;
        case "vector":
          if (a.length != b.length) {
            error(
              "Error in entrywisediv(a,b): a.length = " +
                a.length +
                " != " +
                b.length +
                " = b.length."
            );
            return undefined;
          }
          return divVectors(a, b);
          break;
        case "spvector":
          error("Error in entrywisediv(a,b): b is a sparse vector with zeros.");
          break;
        default:
          error(
            "Error in entrywisediv(a,B): a is a vector and B is a " + tb + "."
          );
          return undefined;
      }
      break;
    case "spvector":
      switch (tb) {
        case "number":
          return mulScalarspVector(1 / b, a);
          break;
        case "vector":
          if (a.length != b.length) {
            error(
              "Error in entrywisediv(a,b): a.length = " +
                a.length +
                " != " +
                b.length +
                " = b.length."
            );
            return undefined;
          }
          return divVectorspVector(a, b);
          break;
        case "spvector":
          error("Error in entrywisediv(a,b): b is a sparse vector with zeros.");
          return undefined;
          break;
        default:
          error(
            "Error in entrywisediv(a,B): a is a vector and B is a " + tb + "."
          );
          return undefined;
      }
      break;
    case "matrix":
      switch (tb) {
        case "number":
          return divMatrixScalar(a, b);
          break;
        case "matrix":
          if (a.m != b.m || a.n != b.n) {
            error(
              "Error in entrywisediv(A,B): size(A) = [" +
                a.m +
                "," +
                a.n +
                "] != [" +
                b.m +
                "," +
                b.n +
                "] = size(B)."
            );
            return undefined;
          }
          return divMatrices(a, b);
          break;
        case "spmatrix":
          error("Error in entrywisediv(A,B): B is a sparse matrix with zeros.");
          return undefined;
          break;
        default:
          error(
            "Error in entrywisediv(A,b): a is a matrix and B is a " + tb + "."
          );
          return undefined;
      }
    case "spmatrix":
      switch (tb) {
        case "number":
          return mulScalarspMatrix(1 / b, a);
          break;
        case "matrix":
          if (a.m != b.m || a.n != b.n) {
            error(
              "Error in entrywisediv(A,B): size(A) = [" +
                a.m +
                "," +
                a.n +
                "] != [" +
                b.m +
                "," +
                b.n +
                "] = size(B)."
            );
            return undefined;
          }
          return divMatrixspMatrix(a, b);
          break;
        case "spmatrix":
          error("Error in entrywisediv(A,B): B is a sparse matrix with zeros.");
          return undefined;
          break;
        default:
          error(
            "Error in entrywisediv(A,b): a is a matrix and B is a " + tb + "."
          );
          return undefined;
      }
      break;
    default:
      error(
        "Error in entrywisediv(a,b): a must be a number, a vector or a matrix."
      );
      return undefined;
      break;
  }
}

export function sum(A, sumalongdimension) {
  switch (type(A)) {
    case "vector":
      if (arguments.length == 1 || sumalongdimension == 1) {
        return sumVector(A);
      } else {
        return vectorCopy(A);
      }
      break;
    case "spvector":
      if (arguments.length == 1 || sumalongdimension == 1)
        return sumVector(A.val);
      else return A.copy();
      break;

    case "matrix":
      if (arguments.length == 1) {
        return sumMatrix(A);
      } else if (sumalongdimension == 1) {
        return sumMatrixRows(A);
      } else if (sumalongdimension == 2) {
        return sumMatrixCols(A);
      } else return undefined;
      break;
    case "spmatrix":
      if (arguments.length == 1) {
        return sumVector(A.val);
      } else if (sumalongdimension == 1) {
        return sumspMatrixRows(A);
      } else if (sumalongdimension == 2) {
        return sumspMatrixCols(A);
      } else return undefined;
      break;
    default:
      return A;
      break;
  }
}

function sumVector(a) {
  var i;
  const n = a.length;
  var res = a[0];
  for (i = 1; i < n; i++) res += a[i];
  return res;
}

function divVectorScalar(a, b) {
  var i;
  const n = a.length;
  var res = new Float64Array(a);
  for (i = 0; i < n; i++) res[i] /= b;
  return res;
}

function solveGaussianElimination(Aorig, borig) {
  // Solve square linear system Ax = b with Gaussian elimination

  var i;
  var j;
  var k;

  var A = matrixCopy(Aorig).toArrayOfFloat64Array(); // useful to quickly switch rows
  var b = vectorCopy(borig);

  const m = Aorig.m;
  const n = Aorig.n;
  if (m != n) return undefined;

  // Set to zero small values... ??

  for (k = 0; k < m; k++) {
    // Find imax = argmax_i=k...m |A_i,k|
    var imax = k;
    var Aimaxk = Math.abs(A[imax][k]);
    for (i = k + 1; i < m; i++) {
      var Aik = Math.abs(A[i][k]);
      if (Aik > Aimaxk) {
        imax = i;
        Aimaxk = Aik;
      }
    }
    if (isZero(Aimaxk)) {
      console.log(
        "** Warning in solve(A,b), A is square but singular, switching from Gaussian elimination to QR method."
      );
      return solveWithQRcolumnpivoting(Aorig, borig);
    }

    if (imax != k) {
      // Permute the rows
      var a = A[k];
      A[k] = A[imax];
      A[imax] = a;
      var tmpb = b[k];
      b[k] = b[imax];
      b[imax] = tmpb;
    }
    var Ak = A[k];

    // Normalize row k
    var Akk = Ak[k];
    b[k] /= Akk;

    //Ak[k] = 1; // not used afterwards
    for (j = k + 1; j < n; j++) Ak[j] /= Akk;

    if (Math.abs(Akk) < 1e-8) {
      console.log(
        "** Warning in solveGaussianElimination: " + Akk + " " + k + ":" + m
      );
    }

    // Substract the kth row from others to get 0s in kth column
    var Aik;
    var bk = b[k];
    for (i = 0; i < m; i++) {
      if (i != k) {
        var Ai = A[i];
        Aik = Ai[k];
        for (j = k + 1; j < n; j++) {
          // Aij = 0  with j < k and Aik = 0 after this operation but is never used
          Ai[j] -= Aik * Ak[j];
        }
        b[i] -= Aik * bk;
      }
    }
  }

  // Solution:
  return b;
}

function matrixCopy(A) {
  var t = type(A);
  switch (t) {
    case "vector":
      return vectorCopy(A);
      break;
    case "ComplexVector":
      return new ComplexVector(A);
      break;
    case "matrix":
      return new Matrix(A.m, A.n, A.val);
      break;
    case "ComplexMatrix":
      return new ComplexMatrix(A);
      break;
    case "Array":
      return arrayCopy(A);
      break;
    case "spvector":
    case "spmatrix":
      return A.copy();
      break;
    default:
      error("Error in matrixCopy(A): A is not a matrix nor a vector.");
      return undefined;
      break;
  }
}

Matrix.prototype.toArrayOfFloat64Array = function () {
  var A = new Array(this.m);
  for (var i = 0; i < this.m; i++)
    A[i] = this.val.subarray(i * this.n, (i + 1) * this.n);

  return A;
};
