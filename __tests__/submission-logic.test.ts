// Note: This is a simplified test for the logic parts of actions.ts 
// that don't depend on external Supabase RPCs directly.
import { z } from 'zod';

// Mocking the dynamic schema creation logic for testing
function createDynamicSchema(extraFields: any[]) {
    const tcknSchema = z.string().length(11);
    const baseCols: Record<string, z.ZodTypeAny> = {
        tckn: tcknSchema,
        sessionToken: z.string().min(1)
    };

    extraFields.forEach(field => {
        let fieldSchema: z.ZodTypeAny;
        switch (field.type) {
            case 'input':
            case 'textarea':
                fieldSchema = z.string();
                if (field.is_required) {
                    fieldSchema = (fieldSchema as z.ZodString).min(1);
                }
                break;
            case 'select':
                fieldSchema = z.string();
                if (field.is_required) {
                    fieldSchema = (fieldSchema as z.ZodString).min(1);
                }
                break;
            default:
                fieldSchema = z.any();
        }
        baseCols[field.id || field.label] = fieldSchema;
    });

    return z.object(baseCols);
}

describe('Submission Flow Logic', () => {
    describe('Dynamic Schema Validation', () => {
        it('should validate required fields', () => {
            const schema = createDynamicSchema([
                { id: 'fullName', type: 'input', is_required: true, label: 'Ad Soyad' }
            ]);

            const validData = { tckn: '12345678901', sessionToken: 'valid', fullName: 'Erkan' };
            expect(schema.safeParse(validData).success).toBe(true);

            const invalidData = { tckn: '12345678901', sessionToken: 'valid', fullName: '' };
            expect(schema.safeParse(invalidData).success).toBe(false);
        });

        it('should handle optional fields', () => {
            const schema = createDynamicSchema([
                { id: 'note', type: 'textarea', is_required: false, label: 'Not' }
            ]);

            const data = { tckn: '12345678901', sessionToken: 'valid', note: '' };
            expect(schema.safeParse(data).success).toBe(true);
        });
    });

    describe('Email Routing Logic Simulation', () => {
        it('should select correct email config based on rules', () => {
            const campaign = {
                default_email_subject: 'Standard Response',
                email_rules: [
                    { condition_field: 'city', condition_value: 'Istanbul', email_subject: 'Welcome from Istanbul' }
                ]
            };

            const formData = { city: 'Istanbul' };

            const matchedRule = (campaign.email_rules || []).find((rule: any) => {
                const val = formData[rule.condition_field as keyof typeof formData];
                return String(val) === String(rule.condition_value);
            });

            const subject = matchedRule ? matchedRule.email_subject : campaign.default_email_subject;
            expect(subject).toBe('Welcome from Istanbul');

            const formDataOther = { city: 'Ankara' };
            const matchedRuleOther = (campaign.email_rules || []).find((rule: any) => {
                const val = formDataOther[rule.condition_field as keyof typeof formDataOther];
                return String(val) === String(rule.condition_value);
            });
            const subjectOther = matchedRuleOther ? matchedRuleOther.email_subject : campaign.default_email_subject;
            expect(subjectOther).toBe('Standard Response');
        });
    });
});

// Helper because safeParse needs to be called on a ZodObject
//@ts-ignore
z.ZodObject.prototype.handleSafeParse = function (data) {
    return this.safeParse(data);
};
