import { renderEmailTemplate } from '../lib/mail-service';

describe('Mail Service', () => {
    describe('renderEmailTemplate', () => {
        it('should replace simple placeholders', () => {
            const template = 'Hello {{name}}!';
            const data = { name: 'Erkan' };
            expect(renderEmailTemplate(template, data)).toBe('Hello Erkan!');
        });

        it('should replace multiple placeholders', () => {
            const template = 'Hello {{name}}, your TCKN is {{tckn}}.';
            const data = { name: 'Erkan', tckn: '12345678901' };
            expect(renderEmailTemplate(template, data)).toBe('Hello Erkan, your TCKN is 12345678901.');
        });

        it('should handle missing keys gracefully by keeping the placeholder', () => {
            const template = 'Hello {{name}}, your age is {{age}}.';
            const data = { name: 'Erkan' };
            expect(renderEmailTemplate(template, data)).toBe('Hello Erkan, your age is {{age}}.');
        });

        it('should handle whitespace in placeholders', () => {
            const template = 'Hello {{ name }}!';
            const data = { name: 'Erkan' };
            expect(renderEmailTemplate(template, data)).toBe('Hello Erkan!');
        });
    });
});
