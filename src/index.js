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

    Assertion.overwriteMethod('members', createMethodWrapper(expand, (assertion) => {
      const chainedFlags = [
       flag(assertion, 'contains') ? 'include' : 'have'
      ]
      if (flag(assertion, 'ordered')) {
        chainedFlags.push('ordered')
      }
      if (flag(assertion, 'deep')) {
        chainedFlags.push('deep')
      }
      chainedFlags.push('members')

      return chainedFlags.join('.')
    }))
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

function createMethodWrapper(expand, buildHint) {
  return function wrapMethod(_super) {
    return function wrappedAssertion() {
      const fauxThis = Object.create(this);
      fauxThis.assert = (pass, failMsg, failNegateMsg, expected, received, showDiff) => {
        const hintParam = `.to.${buildHint(this)}`
        failMsg = buildMessage({ expected, received, hintParam, introSuffix: cleanChaiMessage(failMsg), expand, showDiff })
        failNegateMsg = buildMessage({ expected, received, hintParam: `.not${hintParam}`, introSuffix: cleanChaiMessage(failNegateMsg), expand, showDiff })
        this.assert(pass, failMsg, failNegateMsg, expected, received, showDiff)
      }

      _super.apply(fauxThis, arguments)
    }
  }
}

function cleanChaiMessage(message) {
  return message
    .replace(/#{this}/g, 'value')
    .replace(/^Expected (value )?/i, '')
    .replace(/( as)? #{exp}$/, '')
}
