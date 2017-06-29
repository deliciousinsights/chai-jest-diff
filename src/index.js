import diff from 'jest-diff'
import {
  matcherHint,
  printExpected,
  printReceived
} from 'jest-matcher-utils'

export default function chaiJestDiff (expand = false) {
  return (_chai, { flag, eql }) => {
    const Assertion = _chai.Assertion

    const assertEqual = createAssertion({
      deepPassAssert: 'eql',
      expand,
      flag,
      kind: 'equal',
      name: 'assertEqual',
      passFx: (a, b) => a === b
    })
    Assertion.addMethod('equal', assertEqual)
    Assertion.addMethod('equals', assertEqual)
    Assertion.addMethod('eq', assertEqual)

    const assertEql = createAssertion({
      expand,
      flag,
      kind: 'deep equal',
      name: 'assertEql',
      passFx: eql
    })
    Assertion.addMethod('eql', assertEql)
    Assertion.addMethod('eqls', assertEql)
  }
}

function buildMessage ({ expected, received, hintParam, introSuffix, showDiff, expand }) {
  const diffString = showDiff ? diff(expected, received, { expand }) : null

  return matcherHint(hintParam) +
    '\n\n' +
    `Expected value ${introSuffix}:\n` +
    `  ${printExpected(expected)}\n` +
    `Received:\n` +
    `  ${printReceived(received)}` +
    (diffString ? `\n\nDifference:\n\n${diffString}` : '')
}

function createAssertion({ deepPassAssert, expand, flag, kind, name, passFx }) {
  const result = function syntheticAssert (expected, msg) {
    if (msg) {
      flag(this, 'message', msg)
    }
    if (deepPassAssert && flag(this, 'deep')) {
      return this[deepPassAssert](expected)
    }

    const received = flag(this, 'object')
    const pass = passFx(received, expected)
    const hintSegment = kind.replace(/\s+/, '.')
    const message = pass
      ? buildMessage({ expected, received, hintParam: `.not.to.${hintSegment}`, introSuffix: `not to ${kind}`, expand })
      : buildMessage({ expected, received, hintParam: `.to.${hintSegment}`, introSuffix: `to ${kind}`, showDiff: true, expand })

    this.assert(pass, message, message, expected, received, false)
  }

  result.displayName = name

  return result
}
