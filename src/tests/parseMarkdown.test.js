const { parseMarkdown } = require('../markdownParser');

describe('parseMarkdown', () => {
  test('should parse a valid exec command correctly', () => {
    const markdown = `<!--@abc: exec({"param":"value"}) -->\n\`\`\`bash\n\n \`\`\`\n`;
    const result = parseMarkdown(markdown);
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].type).toBe('exec');
    expect(result.commands[0].args).toEqual({ param: 'value' });
  });

  test('should ignore non-command content', () => {
    const markdown = 'Some regular text\n<!--@abc: exec({"param":"value"}) -->\n\`\`\`bash\n\n \`\`\`\n\nMore text';
    const result = parseMarkdown(markdown);
    expect(result.commands).toHaveLength(1);
  });

  test('should handle multiple commands', () => {
    const markdown = '<!--@abc: exec({"param1":"value1"}) -->\n\`\`\`bash\n\n \`\`\`\n\n<!--@abc: create({"param2":"value2"}) -->\n\`\`\`bash\n\n \`\`\`\n';
    const result = parseMarkdown(markdown);
    expect(result.commands).toHaveLength(2);
    expect(result.commands[1].type).toBe('create');
    expect(result.commands[1].args).toEqual({ param2: 'value2' });
  });

  //test('should ignore invalid command syntax', () => {
  //  const markdown = '<!--@abc: wrong({"param":"value"}) -->';
  //  const result = parseMarkdown(markdown);
  //  expect(result.commands).toHaveLength(0);
  //});

  //test('should handle empty or null input', () => {
  //  let result = parseMarkdown('');
  //  expect(result.commands).toHaveLength(0);

  //  result = parseMarkdown(null);
  //  expect(result.commands).toHaveLength(0);
  //});

});

