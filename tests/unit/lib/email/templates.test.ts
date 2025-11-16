import { describe, it, expect } from 'vitest';
import {
  getCodeRabbitNotInstalledSubject,
  getCodeRabbitNotInstalledHtml,
  getCodeRabbitNotInstalledText,
} from '@/lib/email/templates';

describe('Email Templates', () => {
  describe('getCodeRabbitNotInstalledSubject', () => {
    it('should return the correct subject line', () => {
      const subject = getCodeRabbitNotInstalledSubject();
      expect(subject).toBe('🐰 Your repo is missing a code review buddy!');
    });
  });

  describe('getCodeRabbitNotInstalledHtml', () => {
    it('should generate HTML with repo name', () => {
      const html = getCodeRabbitNotInstalledHtml({ repoName: 'my-repo' });
      expect(html).toContain('my-repo');
      expect(html).toContain('Hey there!');
      expect(html).toContain('CodeRabbit');
      expect(html).toContain('https://app.coderabbit.ai/login?free-trial');
      expect(html).toContain('Get CodeRabbit Free');
    });

    it('should include user name when provided', () => {
      const html = getCodeRabbitNotInstalledHtml({
        repoName: 'my-repo',
        userName: 'John',
      });
      expect(html).toContain('Hey John!');
      expect(html).not.toContain('Hey there!');
    });

    it('should include all CodeRabbit benefits', () => {
      const html = getCodeRabbitNotInstalledHtml({ repoName: 'my-repo' });
      expect(html).toContain('Catches bugs');
      expect(html).toContain('security issues');
      expect(html).toContain('performance improvements');
      expect(html).toContain('code quality');
    });

    it('should be valid HTML', () => {
      const html = getCodeRabbitNotInstalledHtml({ repoName: 'my-repo' });
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
    });
  });

  describe('getCodeRabbitNotInstalledText', () => {
    it('should generate plain text with repo name', () => {
      const text = getCodeRabbitNotInstalledText({ repoName: 'my-repo' });
      expect(text).toContain('my-repo');
      expect(text).toContain('Hey there!');
      expect(text).toContain('CodeRabbit');
      expect(text).toContain('https://app.coderabbit.ai/login?free-trial');
    });

    it('should include user name when provided', () => {
      const text = getCodeRabbitNotInstalledText({
        repoName: 'my-repo',
        userName: 'John',
      });
      expect(text).toContain('Hey John!');
      expect(text).not.toContain('Hey there!');
    });

    it('should include all CodeRabbit benefits', () => {
      const text = getCodeRabbitNotInstalledText({ repoName: 'my-repo' });
      expect(text).toContain('Catches bugs');
      expect(text).toContain('security issues');
      expect(text).toContain('performance improvements');
      expect(text).toContain('code quality');
    });

    it('should not contain HTML tags', () => {
      const text = getCodeRabbitNotInstalledText({ repoName: 'my-repo' });
      expect(text).not.toContain('<html>');
      expect(text).not.toContain('</html>');
      expect(text).not.toContain('<p>');
    });
  });
});


