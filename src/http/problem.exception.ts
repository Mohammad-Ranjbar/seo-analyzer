import { HttpException } from '@nestjs/common';
import type { ProblemInput } from './problem-details.js';

export class ProblemException extends HttpException {
  constructor(problem: ProblemInput) {
    super(problem, problem.status);
  }
}
