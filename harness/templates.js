// Fixed replies for the branches where no agent runs.
function renderNeedsInfo({ client, missing }) {
  return [
    `Dear ${client},`,
    '',
    'Thank you for the request for proposal. To prepare an accurate estimate we need these quantities:',
    '',
    ...missing.map((m) => `- ${m}`),
    '',
    'Please reply with the values and we will return a priced proposal.',
    '',
  ].join('\n');
}

function renderNoBid({ client }) {
  return [
    `Dear ${client},`,
    '',
    'Thank you for the request. The work described is outside construction services, so we are not able to bid on it.',
    'We are glad to quote any construction scope you have.',
    '',
  ].join('\n');
}

module.exports = { renderNeedsInfo, renderNoBid };
