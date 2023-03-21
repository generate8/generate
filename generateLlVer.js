/**
 * init generators, (link-list version)
 * @typedef {import('./generators').Gen} Gen
 * @typedef {object} LlGenSpecific A generator with a link to the next-best
                                   generator.
 * @typedef {Gen & LlGenSpecific} LlGen
 * @param {(gen: LlGen) => any} getIdFn
 * @param {(gen: LlGen) => boolean} shouldGeneratorBeRemovedFn
 * @param {(genX: LlGen, genY: LlGen) => boolean} isXABetterGeneratorThanYFn
 * @param {(gen: LlGen) => Promise<void>} notifyGeneratorChangedFn
 * @param {(id: any) => Promise<any>} getGeneratorFn
 * @param {(id: any) => Promise<void>} deleteGeneratorFn
 * @param {(gen: LlGen) => any} getNextGeneratorIdFn
 * @param {(generator: LlGen, nextGeneratorId: any) => void } setNextGeneratorIdFn
 */
export async function initGenerators(
  getIdFn,
  shouldGeneratorBeRemovedFn,
  isXABetterGeneratorThanYFn,
  notifyGeneratorChangedFn,
  getGeneratorFn,
  deleteGeneratorFn,
  getNextGeneratorIdFn,
  setNextGeneratorIdFn
) {
  nextGeneratorId = getNextGeneratorIdFn;
  setNextGeneratorId = setNextGeneratorIdFn;
  getId = getIdFn;
  shouldGeneratorBeRemoved = shouldGeneratorBeRemovedFn;
  isXBetterGeneratorThanY = isXABetterGeneratorThanYFn;
  notifyGeneratorChanged = notifyGeneratorChangedFn;
  getGenerator = getGeneratorFn;
  deleteGenerator = async (/** @type {any} */ id) => {
    await deleteGeneratorFn(id);
    numOfGenerators_--;
  };
  numOfGenerators_ = 0;
}

export async function generate() {
  const firstGen = /** @type {LlGen} */ (firstGenerator);
  const generated = firstGen.next().value;
  if (generated != null) {
    await notifyGeneratorChanged(firstGen);
    return generated;
  }
  if (nextGeneratorId(firstGen) != null) {
    firstGenerator = await getGenerator(nextGeneratorId(firstGen));
  }
  await deleteGenerator(getId(firstGen));
  return null;
}

/** @type {(gen:Gen)=>string} */
let nextGeneratorId;

export async function removeUnwantedGenerators() {
  let generator = firstGenerator;
  /** @type {LlGen|null} */
  let prevGenerator = null;
  while (generator != null) {
    const nextGenerator =
      nextGeneratorId(generator) == null
        ? null
        : await getGenerator(nextGeneratorId(generator));
    if (!shouldGeneratorBeRemoved(generator)) {
      prevGenerator = generator;
      generator = nextGenerator;
      continue;
    }
    if (prevGenerator != null) {
      setNextGeneratorId(prevGenerator, nextGeneratorId(generator));
      await notifyGeneratorChanged(prevGenerator);
    }
    if (generator === firstGenerator) {
      firstGenerator = nextGenerator;
    }
    await deleteGenerator(getId(generator));
    generator = nextGenerator;
  }
}

/** @type {(generator:LlGen,nextGeneratorId:any)=>void} */
let setNextGeneratorId;

/**
 * @param {any} generator
 *  must be a new generator that is not already in the link-list
 */
export async function addGenerator(generator) {
  generator.id = getId(generator);
  if (firstGenerator != null) {
    await addNonFirstGenerator(generator);
    return;
  }
  firstGenerator = generator;
  numOfGenerators_++;
  await notifyGeneratorChanged(generator);
}

/**
 * @param {LlGen} generator
 */
async function addNonFirstGenerator(generator) {
  let nextGenerator = firstGenerator;
  let previousGenerator = null;
  while (true) {
    if (
      nextGenerator == null ||
      isXBetterGeneratorThanY(generator, nextGenerator)
    ) {
      //Found the location to insert at. So insert and exit.
      await insertGenerator(generator, nextGenerator, previousGenerator);
      return;
    }
    previousGenerator = nextGenerator;
    if (nextGeneratorId(nextGenerator) == null) {
      nextGenerator = null;
    } else {
      nextGenerator = await getGenerator(nextGeneratorId(nextGenerator));
    }
  }
}

/**
 * @param {LlGen} generator
 * @param {LlGen|null} nextGenerator
 * @param {LlGen|null} previousGenerator
 */
async function insertGenerator(generator, nextGenerator, previousGenerator) {
  if (nextGenerator) {
    setNextGeneratorId(generator, getId(nextGenerator));
  }
  await notifyGeneratorChanged(generator);
  if (previousGenerator == null) {
    firstGenerator = generator;
  } else {
    setNextGeneratorId(previousGenerator, getId(generator));
    await notifyGeneratorChanged(previousGenerator);
  }
  numOfGenerators_++;
}

export function numOfGenerators() {
  return numOfGenerators_;
}

// Note: comment out calls to assertions once sure that the logic is sound.
/**
 * @param {boolean} x
 * @param { undefined | (()=>void) } [fnToExecOnFail]
 */
function assert(x, fnToExecOnFail) {
  if (!x) {
    console.log("ASSERT FAILED");
    if (fnToExecOnFail) fnToExecOnFail();
    throw new Error("assertion failed");
  }
}

/**
 * @type {(gen: LlGen) => boolean}
 */
let shouldGeneratorBeRemoved;

/**
 * @type {(x: LlGen, y: LlGen) => boolean}
 */
let isXBetterGeneratorThanY;

/**
 * @type {number}
 */
let numOfGenerators_;

/**
 * @type {(gen: LlGen) => Promise<void>}
 */
let notifyGeneratorChanged;

/**
 * @type {(id: any) => Promise<LlGen>}
 */
let getGenerator;

/**
 * @type {((id: any) => Promise<void>)}
 */
let deleteGenerator;

/**
 * @type {LlGen | null}
 */
let firstGenerator;

/**
 * @type {(generator: LlGen) => any}
 */
let getId;
